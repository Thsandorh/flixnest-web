'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import Hls from 'hls.js';
import { AlertCircle, RefreshCw, Copy, ExternalLink } from 'lucide-react';
import { buildProxyUrl, isHlsUrl } from '@/lib/stream-utils';

interface VideoPlayerProps {
  src: string;
  headers?: Record<string, string>;
  poster?: string;
  title?: string;
  startTime?: number;
  subtitles?: Array<{ src: string; label: string; srclang: string }>;
  onProgress?: (currentTime: number, duration: number) => void;
  onEnded?: () => void;
}

export function VideoPlayer({
  src,
  headers,
  poster,
  title,
  startTime = 0,
  subtitles = [],
  onProgress,
  onEnded,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Build the proxied URL
  const getProxiedUrl = useCallback((url: string): string => {
    // Skip if already proxied
    if (url.includes('/api/proxy?')) {
      return url;
    }
    // Always proxy external URLs
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return buildProxyUrl(url, headers);
    }
    return url;
  }, [headers]);

  // Initialize player
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    // Cleanup previous HLS instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    setError(null);
    setIsLoading(true);

    const proxiedUrl = getProxiedUrl(src);
    const isHls = isHlsUrl(src);

    console.log('[VideoPlayer] Source:', src.substring(0, 80));
    console.log('[VideoPlayer] Proxied:', proxiedUrl.substring(0, 100));
    console.log('[VideoPlayer] Is HLS:', isHls);

    if (isHls) {
      // HLS stream
      if (Hls.isSupported()) {
        console.log('[VideoPlayer] Using HLS.js');
        const hls = new Hls({
          debug: false,
          enableWorker: true,
          lowLatencyMode: false,
          maxBufferLength: 30,
          maxMaxBufferLength: 60,
          maxBufferSize: 60 * 1000 * 1000, // 60MB
          maxBufferHole: 0.5,
          fragLoadingTimeOut: 20000,
          manifestLoadingTimeOut: 10000,
          levelLoadingTimeOut: 10000,
        });

        hlsRef.current = hls;

        hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
          console.log('[VideoPlayer] Manifest parsed, levels:', data.levels.length);
          setIsLoading(false);
          video.play().catch(e => console.warn('[VideoPlayer] Autoplay blocked:', e.message));
        });

        hls.on(Hls.Events.ERROR, (_, data) => {
          console.error('[VideoPlayer] HLS Error:', data.type, data.details);

          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                console.log('[VideoPlayer] Network error, attempting recovery...');
                hls.startLoad();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                console.log('[VideoPlayer] Media error, attempting recovery...');
                hls.recoverMediaError();
                break;
              default:
                setError(`Playback failed: ${data.details}`);
                setIsLoading(false);
                break;
            }
          }
        });

        hls.loadSource(proxiedUrl);
        hls.attachMedia(video);

      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        // Safari native HLS
        console.log('[VideoPlayer] Using native HLS (Safari)');
        video.src = proxiedUrl;
        video.addEventListener('loadedmetadata', () => {
          setIsLoading(false);
          video.play().catch(e => console.warn('[VideoPlayer] Autoplay blocked:', e.message));
        }, { once: true });
      } else {
        setError('Your browser does not support HLS playback');
        setIsLoading(false);
      }
    } else {
      // Direct video (MP4, etc.)
      console.log('[VideoPlayer] Using native video');
      video.src = proxiedUrl;
      video.addEventListener('loadedmetadata', () => {
        setIsLoading(false);
        video.play().catch(e => console.warn('[VideoPlayer] Autoplay blocked:', e.message));
      }, { once: true });
    }

    // Handle native video errors
    const handleError = () => {
      const mediaError = video.error;
      console.error('[VideoPlayer] Video error:', mediaError?.code, mediaError?.message);
      setError(mediaError?.message || 'Video playback failed');
      setIsLoading(false);
    };

    video.addEventListener('error', handleError);

    return () => {
      video.removeEventListener('error', handleError);
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [src, getProxiedUrl]);

  // Set start time
  useEffect(() => {
    const video = videoRef.current;
    if (!video || startTime <= 0) return;

    const handleLoaded = () => {
      if (startTime > 0 && startTime < video.duration) {
        video.currentTime = startTime;
      }
    };

    video.addEventListener('loadedmetadata', handleLoaded);
    return () => video.removeEventListener('loadedmetadata', handleLoaded);
  }, [startTime]);

  // Progress tracking
  useEffect(() => {
    if (!onProgress) return;

    const video = videoRef.current;
    if (!video) return;

    progressIntervalRef.current = setInterval(() => {
      if (!video.paused && video.duration > 0) {
        onProgress(video.currentTime, video.duration);
      }
    }, 5000);

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [onProgress]);

  // Handle ended
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !onEnded) return;

    video.addEventListener('ended', onEnded);
    return () => video.removeEventListener('ended', onEnded);
  }, [onEnded]);

  // Retry playback
  const handleRetry = () => {
    setError(null);
    setIsLoading(true);

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const video = videoRef.current;
    if (video) {
      video.load();
    }
  };

  // Copy URL to clipboard
  const handleCopyUrl = () => {
    navigator.clipboard.writeText(src);
  };

  // Open in external player
  const handleExternalPlayer = () => {
    window.location.href = `vlc://${src}`;
  };

  return (
    <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden">
      <video
        ref={videoRef}
        poster={poster}
        controls
        controlsList="nodownload"
        playsInline
        className="w-full h-full"
        crossOrigin="anonymous"
      >
        {subtitles.map((sub, idx) => (
          <track
            key={idx}
            kind="subtitles"
            src={buildProxyUrl(sub.src)}
            label={sub.label}
            srcLang={sub.srclang}
          />
        ))}
      </video>

      {/* Loading overlay */}
      {isLoading && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-red-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-white text-sm">Loading stream...</p>
          </div>
        </div>
      )}

      {/* Error overlay */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/90">
          <div className="flex flex-col items-center gap-4 p-6 max-w-md text-center">
            <AlertCircle className="w-12 h-12 text-red-500" />
            <p className="text-white font-medium">{error}</p>

            <div className="flex flex-wrap justify-center gap-3">
              <button
                onClick={handleRetry}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Retry
              </button>
              <button
                onClick={handleCopyUrl}
                className="flex items-center gap-2 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg transition-colors"
              >
                <Copy className="w-4 h-4" />
                Copy URL
              </button>
              <button
                onClick={handleExternalPlayer}
                className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                Open in VLC
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default VideoPlayer;
