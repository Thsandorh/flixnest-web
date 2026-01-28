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
      destroyHls();
      await destroyShaka();

      let finalUrl = src;
      // Always proxy remote URLs (http/https) to handle CORS
      if (/^https?:\/\//i.test(finalUrl)) {
        finalUrl = proxyUrl(finalUrl, headers);
      }

      v.pause();
      v.removeAttribute('src');
      v.load();

      // Define helper functions first
      const setupHls = (url: string) => {
        if (Hls.isSupported()) {
          const hls = new Hls();
          hlsRef.current = hls;
          hls.loadSource(url);
          hls.attachMedia(v);
          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            if (startTime > 0) {
              v.currentTime = startTime;
            }
          });
          hls.on(Hls.Events.ERROR, (_evt, data) => {
            console.warn('[HLS] error:', data?.type, data?.details, data?.response?.code);

            if (data.fatal) {
              switch (data.type) {
                case Hls.ErrorTypes.NETWORK_ERROR:
                  console.error('[HLS] Fatal network error, trying to recover...');
                  hls.startLoad();
                  break;
                case Hls.ErrorTypes.MEDIA_ERROR:
                  console.error('[HLS] Fatal media error, trying to recover...');
                  hls.recoverMediaError();
                  break;
                default:
                  console.error('[HLS] Fatal error, cannot recover');
                  destroyHls();
                  break;
              }
            }
          });
          return true;
        }

        if (v.canPlayType('application/vnd.apple.mpegurl')) {
          v.src = url;
          return true;
        }

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

      // Check if this is a proxied URL or HLS source
      const isProxiedUrl = finalUrl.startsWith('/api/proxy');
      const isHlsSource = isHls(finalUrl);

      // For proxied URLs, always try HLS.js first (WebStreamr returns HLS)
      if (isProxiedUrl || isHlsSource) {
        if (setupHls(finalUrl)) {
          return;
        }
        console.warn('[HLS] Failed to setup, trying alternatives...');
      }

      // Try Shaka for non-HLS sources (best codec support)
      try {
        const shakaModule = await import('shaka-player/dist/shaka-player.compiled');
        const shaka = shakaModule.default || shakaModule;

        shaka.polyfill.installAll();
        if (shaka.Player.isBrowserSupported()) {
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
            console.error('[SHAKA] Error:', error);

            if (error?.code === 4032 || error?.code === 1001 || error?.severity === 2) {
              await destroyShaka();
              fallbackToNative(finalUrl);
            }
          });

          try {
            await player.load(finalUrl);
            return;
          } catch (loadError) {
            console.warn('[SHAKA] Load error, falling back:', loadError);
            await destroyShaka();
          }
        }
      } catch (e) {
        console.warn('[SHAKA] Not available, falling back');
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
    </div>
  );
}

export default VideoPlayer;
