'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import Hls from 'hls.js';
import { ExternalLink, Smartphone, Download } from 'lucide-react';
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
  disableProxy?: boolean;
  onProgress?: (currentTime: number, duration: number) => void;
  onEnded?: () => void;
  onPlay?: () => void;
  onPause?: () => void;
}

function isHls(url: string): boolean {
  if (/\.m3u8(\?.*)?$/i.test(url)) return true;
  try {
    const u = new URL(url, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
    const inner = u.searchParams.get('url');
    if (inner && /\.m3u8(\?.*)?$/i.test(inner)) return true;
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

function normalizeStreamUrl(url: string): string {
  let cleaned = url.trim();

  if (/^vlc:\/\//i.test(cleaned)) {
    cleaned = cleaned.replace(/^vlc:\/\//i, '');
  }

  cleaned = cleaned.replace(/^http:\/(?!\/)/i, 'http://');
  cleaned = cleaned.replace(/^https:\/(?!\/)/i, 'https://');
  cleaned = cleaned.replace(/^(https?)\/\/(?!\/)/i, '$1://');

  return cleaned;
}

function getVlcDeepLink(url: string): string {
  const normalizedUrl = normalizeStreamUrl(url);

  if (typeof navigator === 'undefined') {
    return `vlc://${normalizedUrl}`;
  }

  const ua = navigator.userAgent || '';
  const isIOS = /iPhone|iPad|iPod/i.test(ua);
  const isAndroid = /Android/i.test(ua);

  if (isIOS) {
    return `vlc-x-callback://x-callback-url/stream?url=${encodeURIComponent(normalizedUrl)}`;
  }

  if (isAndroid) {
    return `intent:${normalizedUrl}#Intent;package=org.videolan.vlc;action=android.intent.action.VIEW;type=video/*;end`;
  }

  return `vlc:${normalizedUrl}`;
}

function proxyUrl(
  url: string,
  headers?: Record<string, string>,
  absolute: boolean = true,
  ext?: string
): string {
  const referer = headers?.Referer || headers?.referer;
  const ua = headers?.['User-Agent'] || headers?.['user-agent'];

  try {
    const base = typeof window !== 'undefined' ? window.location.origin : 'http://localhost';
    const u = new URL(url, base);
    if (u.pathname === '/api/proxy') {
      if (referer && !u.searchParams.get('referer')) u.searchParams.set('referer', referer);
      if (ua && !u.searchParams.get('ua')) u.searchParams.set('ua', ua);
      if (ext && !u.searchParams.get('ext')) u.searchParams.set('ext', ext);
      const res = `${u.pathname}?${u.searchParams.toString()}`;
      if (absolute && typeof window !== 'undefined') {
        const origin = window.location.origin.replace('localhost', '127.0.0.1');
        return origin + res;
      }
      return res;
    }
  } catch {
    // fall through
  }

  const params = new URLSearchParams();
  params.set('url', url);
  if (referer) params.set('referer', referer);
  if (ua) params.set('ua', ua);
  if (ext) params.set('ext', ext);

  const res = `/api/proxy?${params.toString()}`;
  if (absolute && typeof window !== 'undefined') {
    const origin = window.location.origin.replace('localhost', '127.0.0.1');
    return origin + res;
  }
  return res;
}

export function VideoPlayer({
  src,
  poster,
  title,
  subtitles = [],
  headers,
  startTime = 0,
  disableProxy = false,
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
    window.location.href = getVlcDeepLink(src);
  };

  const downloadM3U = () => {
    const normalizedUrl = normalizeStreamUrl(src);
    const safeTitle = (title || 'stream')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    const filename = safeTitle ? `${safeTitle}.m3u` : 'stream.m3u';

    const options: string[] = [];

    // Add headers if provided
    if (headers) {
      const ua = headers['User-Agent'] || headers['user-agent'];
      const referer =
        headers['Referer'] ||
        headers['referer'] ||
        headers['Referrer'] ||
        headers['referrer'];
      if (ua) options.push(`#EXTVLCOPT:http-user-agent=${ua}`);
      if (referer) options.push(`#EXTVLCOPT:http-referrer=${referer}`);
    }

    // Add subtitles using input-slave (works for HTTP URLs in VLC)
    // Keep only 1 subtitle per language to avoid VLC issues with too many input-slave options
    console.log('[VideoPlayer M3U] Total subtitles:', subtitles.length);
    const seenLanguages = new Set<string>();
    const subtitleOptions: string[] = [];
    for (const subtitle of subtitles) {
      console.log('[VideoPlayer M3U] Processing subtitle:', subtitle.srclang, subtitle.src.substring(0, 50));
      if (seenLanguages.has(subtitle.srclang)) {
        console.log('[VideoPlayer M3U] Skipping duplicate language:', subtitle.srclang);
        continue;
      }
      seenLanguages.add(subtitle.srclang);
      subtitleOptions.push(`#EXTVLCOPT:input-slave=${subtitle.src}`);
    }
    console.log('[VideoPlayer M3U] Subtitles after language dedup:', subtitleOptions.length);
    console.log('[VideoPlayer M3U] Unique languages:', Array.from(seenLanguages));

    const content = [
      '#EXTM3U',
      ...options,
      ...subtitleOptions,
      normalizedUrl,
      '',
    ].join('\r\n');

    const blob = new Blob([content], { type: 'audio/x-mpegurl' });
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(objectUrl);
  };

  const handleVlcClick = () => {
    const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent || ''
    );

    if (isMobileDevice) {
      openInVLC();
      return;
    }

    downloadM3U();
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

      // Determine if this is an HLS stream and pass the ext parameter
      const isHlsStream = isHls(src);
      const ext = isHlsStream ? 'm3u8' : undefined;
      // Use proxy only if not disabled (USA TV streams work better without proxy)
      const shouldUseProxy = !disableProxy && /^https?:\/\//i.test(src);
      const finalUrl = shouldUseProxy ? proxyUrl(src, headers, true, ext) : src;

      console.log('[VideoPlayer] Setting up playback');
      console.log('[VideoPlayer] Original URL:', src.substring(0, 100));
      console.log('[VideoPlayer] Final URL:', finalUrl.substring(0, 100));
      console.log('[VideoPlayer] Is HLS:', isHlsStream);
      console.log('[VideoPlayer] Using proxy:', shouldUseProxy);
      console.log('[VideoPlayer] Headers:', headers);

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

      // Prefer HLS.js for HLS sources (Shaka can fail on TS playlists)
      if (isHls(finalUrl)) {
        if (!setupHls(finalUrl)) {
          console.warn('[HLS] not supported in this browser');
          fallbackToNative(finalUrl);
        }
        return;
      }

      // Try Shaka first (best codec support)
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
              src={proxyUrl(track.src)}
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
        <button
          onClick={handleVlcClick}
          className="flex-1 min-w-[120px] flex items-center justify-center gap-2 px-4 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-colors"
        >
          <ExternalLink className="w-5 h-5" />
          Open in VLC
        </button>

        <button
          onClick={downloadM3U}
          className="flex-1 min-w-[120px] flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
        >
          <Download className="w-5 h-5" />
          Download
        </button>

        {isMobile && (
          <button
            onClick={openInExternalPlayer}
            className="flex-1 min-w-[120px] flex items-center justify-center gap-2 px-4 py-3 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg font-medium transition-colors"
          >
            <Smartphone className="w-5 h-5" />
            External Player
          </button>
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
