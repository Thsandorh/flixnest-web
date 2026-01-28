'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import Hls from 'hls.js';
import { ExternalLink, Smartphone } from 'lucide-react';
import { motion } from 'framer-motion';

interface SubtitleTrack {
  src: string;
  label: string;
  srclang: string;
}

interface VideoPlayerProps {
  src: string;
  poster?: string;
  title?: string;
  subtitles?: SubtitleTrack[];
  headers?: Record<string, string>;
  startTime?: number;
  onProgress?: (currentTime: number, duration: number) => void;
  onEnded?: () => void;
  onPlay?: () => void;
  onPause?: () => void;
}

function isHls(url: string): boolean {
  // Check if URL contains .m3u8 anywhere (not just at the end)
  if (url.toLowerCase().includes('.m3u8')) return true;
  try {
    const u = new URL(url, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
    const inner = u.searchParams.get('url');
    if (inner && inner.toLowerCase().includes('.m3u8')) return true;
  } catch {}
  return false;
}

function isDash(url: string): boolean {
  if (/\.mpd(\?.*)?$/i.test(url)) return true;
  try {
    const u = new URL(url, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
    const inner = u.searchParams.get('url');
    if (inner && /\.mpd(\?.*)?$/i.test(inner)) return true;
  } catch {}
  return false;
}

function proxyUrl(url: string, headers?: Record<string, string>): string {
  if (url.startsWith('/api/proxy')) {
    return url;
  }

  const params = new URLSearchParams();
  params.set('url', url);

  if (headers && Object.keys(headers).length > 0) {
    params.set('headers', JSON.stringify(headers));
  }

  return `/api/proxy?${params.toString()}`;
}

export function VideoPlayer({
  src,
  poster,
  title,
  subtitles = [],
  headers,
  startTime = 0,
  onProgress,
  onEnded,
  onPlay,
  onPause,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const shakaRef = useRef<any>(null);
  const [isMobile, setIsMobile] = useState(false);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastProgressRef = useRef<number>(0);
  const [debugLogs, setDebugLogs] = useState<string[]>([]);

  const addLog = (msg: string) => {
    setDebugLogs(prev => [...prev.slice(-10), `${new Date().toLocaleTimeString()}: ${msg}`]);
  };

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
          navigator.userAgent
        ) || window.innerWidth < 768
      );
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const destroyHls = useCallback(() => {
    if (hlsRef.current) {
      try {
        hlsRef.current.destroy();
      } catch {}
      hlsRef.current = null;
    }
  }, []);

  const destroyShaka = useCallback(async () => {
    if (shakaRef.current) {
      try {
        await shakaRef.current.destroy();
      } catch {}
      shakaRef.current = null;
    }
  }, []);

  // Save progress periodically
  useEffect(() => {
    progressIntervalRef.current = setInterval(() => {
      const player = videoRef.current;
      if (player && player.currentTime > 0 && !player.paused) {
        const currentTime = player.currentTime;
        const duration = player.duration || 0;

        if (Math.abs(currentTime - lastProgressRef.current) >= 5) {
          lastProgressRef.current = currentTime;
          onProgress?.(currentTime, duration);
        }
      }
    }, 5000);

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [onProgress]);

  const handlePause = useCallback(() => {
    const player = videoRef.current;
    if (player && player.currentTime > 0) {
      onProgress?.(player.currentTime, player.duration || 0);
      onPause?.();
    }
  }, [onProgress, onPause]);

  const handleEnded = useCallback(() => {
    const player = videoRef.current;
    if (player) {
      onProgress?.(player.duration || 0, player.duration || 0);
      onEnded?.();
    }
  }, [onProgress, onEnded]);

  const handlePlay = useCallback(() => {
    onPlay?.();
  }, [onPlay]);

  const handleSeeked = useCallback(() => {
    const player = videoRef.current;
    if (player) {
      lastProgressRef.current = player.currentTime;
    }
  }, []);

  // Open in VLC
  const openInVLC = () => {
    const vlcUrl = `vlc://${src}`;
    window.location.href = vlcUrl;
  };

  // Open in external player (for Android)
  const openInExternalPlayer = () => {
    const intentUrl = `intent:${src}#Intent;type=video/*;end`;
    window.location.href = intentUrl;
  };

  // Copy URL to clipboard
  const copyStreamUrl = () => {
    navigator.clipboard.writeText(src);
    alert('Stream URL copied to clipboard!');
  };

  // Open stream in new tab
  const openInNewTab = () => {
    window.open(src, '_blank');
  };

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    const setupPlayback = async () => {
      addLog('Starting playback setup...');
      addLog(`Source: ${src.substring(0, 60)}...`);
      addLog(`Headers: ${headers ? JSON.stringify(headers).substring(0, 50) : 'none'}`);
      destroyHls();
      await destroyShaka();

      let finalUrl = src;
      // Always proxy remote URLs (http/https) to handle CORS
      if (/^https?:\/\//i.test(finalUrl)) {
        finalUrl = proxyUrl(finalUrl, headers);
        addLog(`Proxied URL: ${finalUrl.substring(0, 60)}...`);

        // Debug: fetch and check what proxy returns (non-blocking with timeout)
        const fetchWithTimeout = async () => {
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            const debugResp = await fetch(finalUrl, { signal: controller.signal });
            clearTimeout(timeoutId);
            const debugText = await debugResp.text();
            addLog(`Proxy response: ${debugResp.status}`);
            addLog(`Content starts with: ${debugText.substring(0, 100)}`);
            if (!debugText.startsWith('#EXTM3U') && !debugText.startsWith('<')) {
              addLog('WARNING: Not a valid M3U8 or video!');
            }
          } catch (e: any) {
            addLog(`Fetch error: ${e.message}`);
          }
        };
        // Run debug fetch in background without blocking
        fetchWithTimeout();
        addLog('Continuing with player setup...');
      }

      addLog('Preparing video element...');
      v.pause();
      v.removeAttribute('src');
      v.load();
      addLog('Video element ready');

      // Define helper functions first
      const setupHls = (url: string) => {
        addLog(`Setting up HLS for: ${url.substring(0, 50)}...`);
        if (Hls.isSupported()) {
          addLog('HLS.js supported, creating instance');
          const hls = new Hls();
          hlsRef.current = hls;
          hls.loadSource(url);
          hls.attachMedia(v);
          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            addLog('Manifest parsed OK');
            if (startTime > 0) {
              v.currentTime = startTime;
            }
          });
          hls.on(Hls.Events.MANIFEST_LOADED, () => {
            addLog('Manifest loaded OK');
          });
          hls.on(Hls.Events.FRAG_LOADED, () => {
            addLog('Fragment loaded OK');
          });
          hls.on(Hls.Events.ERROR, (_evt, data) => {
            addLog(`HLS ERROR: ${data?.type} - ${data?.details} - ${data?.response?.code || 'no code'}`);

            if (data.fatal) {
              switch (data.type) {
                case Hls.ErrorTypes.NETWORK_ERROR:
                  addLog('Fatal network error, retrying...');
                  hls.startLoad();
                  break;
                case Hls.ErrorTypes.MEDIA_ERROR:
                  addLog('Fatal media error, recovering...');
                  hls.recoverMediaError();
                  break;
                default:
                  addLog('Fatal error, cannot recover');
                  destroyHls();
                  break;
              }
            }
          });
          return true;
        }

        if (v.canPlayType('application/vnd.apple.mpegurl')) {
          addLog('Using native HLS');
          v.src = url;
          return true;
        }

        addLog('HLS not supported');
        return false;
      };

      const fallbackToNative = (url: string) => {
        if (isHls(url)) {
          if (setupHls(url)) return;
        }

        if (isDash(url)) {
          v.src = url;
          return;
        }

        v.src = url;
      };

      // Try Shaka Player first for ALL sources (best codec and format support, including HLS/M3U8)
      try {
        addLog('Attempting Shaka Player...');
        const shakaModule = await import('shaka-player/dist/shaka-player.compiled');
        addLog('Shaka module imported');
        const shaka = shakaModule.default || shakaModule;

        addLog('Installing polyfills...');
        shaka.polyfill.installAll();
        addLog('Polyfills installed');
        if (shaka.Player.isBrowserSupported()) {
          addLog('Shaka Player browser supported');
          const player = new shaka.Player(v);
          shakaRef.current = player;

          player.configure({
            preferredAudioChannelCount: 6,
            preferredAudioCodecs: ['ec-3', 'ac-3', 'mp4a'],
            streaming: {
              bufferingGoal: 30,
              rebufferingGoal: 2,
              bufferBehind: 30,
              alwaysStreamText: false,
            },
            manifest: {
              defaultPresentationDelay: 10,
            },
            abr: {
              enabled: true,
            },
          });

          player.addEventListener('error', async (event: any) => {
            const error = event?.detail;
            addLog(`Shaka error: ${error?.code} - ${error?.message}`);
            console.error('[SHAKA] Error:', error);

            if (error?.code === 4032 || error?.code === 1001 || error?.severity === 2) {
              addLog('Fatal Shaka error, falling back...');
              await destroyShaka();
              fallbackToNative(finalUrl);
            }
          });

          try {
            addLog('Loading source with Shaka Player...');
            await player.load(finalUrl);
            addLog('Shaka Player loaded successfully!');
            if (startTime > 0) {
              v.currentTime = startTime;
            }
            return;
          } catch (loadError: any) {
            addLog(`Shaka load failed: ${loadError?.message || loadError}`);
            console.warn('[SHAKA] Load error, falling back:', loadError);
            await destroyShaka();
          }
        } else {
          addLog('Shaka Player not supported in this browser');
        }
      } catch (e: any) {
        addLog(`Shaka error: ${e?.message || e}`);
        console.warn('[SHAKA] Not available, falling back');
      }

      // Check if this is a proxied URL or HLS source
      const isProxiedUrl = finalUrl.startsWith('/api/proxy');
      const isHlsSource = isHls(finalUrl);

      // Fallback to HLS.js for HLS/M3U8 sources if Shaka failed
      if (isProxiedUrl || isHlsSource) {
        addLog('Trying HLS.js as fallback...');
        if (setupHls(finalUrl)) {
          return;
        }
        addLog('HLS.js failed, trying native...');
      }

      fallbackToNative(finalUrl);
    };

    setupPlayback();

    return () => {
      destroyHls();
      destroyShaka();
    };
  }, [src, headers, startTime, destroyHls, destroyShaka]);

  return (
    <div className="relative w-full">
      <div className="w-full aspect-video bg-black rounded-xl overflow-hidden">
        <video
          ref={videoRef}
          className="w-full h-full"
          controls
          playsInline
          poster={poster}
          onPlay={handlePlay}
          onPause={handlePause}
          onEnded={handleEnded}
          onSeeked={handleSeeked}
          onLoadedMetadata={() => {
            if (startTime > 0 && videoRef.current) {
              videoRef.current.currentTime = startTime;
            }
          }}
        >
          {subtitles.map((track, index) => (
            <track
              key={`${track.srclang}-${index}`}
              src={track.src}
              kind="subtitles"
              label={track.label}
              srcLang={track.srclang}
              default={track.srclang === 'en' && index === 0}
            />
          ))}
        </video>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-wrap gap-3 mt-4"
      >
        {isMobile && (
          <>
            <button
              onClick={openInVLC}
              className="flex-1 min-w-[120px] flex items-center justify-center gap-2 px-4 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-colors"
            >
              <ExternalLink className="w-5 h-5" />
              Open in VLC
            </button>

            <button
              onClick={openInExternalPlayer}
              className="flex-1 min-w-[120px] flex items-center justify-center gap-2 px-4 py-3 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg font-medium transition-colors"
            >
              <Smartphone className="w-5 h-5" />
              External Player
            </button>
          </>
        )}

        <button
          onClick={copyStreamUrl}
          className="flex-1 min-w-[120px] flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors text-sm"
        >
          Copy URL
        </button>

        <button
          onClick={openInNewTab}
          className="flex-1 min-w-[120px] flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors text-sm"
        >
          Test in Browser
        </button>
      </motion.div>

      <div className="hidden md:flex items-center justify-center gap-6 mt-4 text-xs text-zinc-500">
        <span>
          <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded">Space</kbd> Play/Pause
        </span>
        <span>
          <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded">Left</kbd>
          <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded">Right</kbd> Seek 10s
        </span>
        <span>
          <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded">F</kbd> Fullscreen
        </span>
        <span>
          <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded">M</kbd> Mute
        </span>
        <span>
          <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded">C</kbd> Captions
        </span>
      </div>

      {/* Debug logs */}
      {debugLogs.length > 0 && (
        <div className="mt-4 p-3 bg-zinc-900 rounded-lg text-xs font-mono text-green-400 max-h-48 overflow-y-auto">
          <div className="font-bold text-white mb-2">Debug Log:</div>
          {debugLogs.map((log, i) => (
            <div key={i} className="break-all">{log}</div>
          ))}
        </div>
      )}
    </div>
  );
}

export default VideoPlayer;
