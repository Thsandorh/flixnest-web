'use client';

import { useRef, useEffect, useState } from 'react';
import Hls from 'hls.js';
import { ExternalLink, Smartphone } from 'lucide-react';

interface VideoPlayerProps {
  src: string;
  poster?: string;
  title?: string;
  subtitles?: { src: string; label: string; srclang: string }[];
  headers?: Record<string, string>;
  startTime?: number;
  onProgress?: (currentTime: number, duration: number) => void;
  onEnded?: () => void;
  onPlay?: () => void;
  onPause?: () => void;
}

export function VideoPlayer({
  src,
  poster,
  subtitles = [],
  startTime = 0,
  onProgress,
  onEnded,
  onPlay,
  onPause,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsMobile(/Android|iPhone|iPad|iPod/i.test(navigator.userAgent));
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Cleanup previous
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    setError(null);

    const isHlsStream = src.includes('.m3u8') || src.includes('m3u8') ||
                        src.includes('playlist') || src.includes('vixsrc') ||
                        src.includes('vidsrc');

    if (isHlsStream && Hls.isSupported()) {
      // Use HLS.js for Chrome/Firefox
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: 90,
      });
      hlsRef.current = hls;

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (startTime > 0) video.currentTime = startTime;
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
            setError('Network error - stream may be unavailable');
          } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
            hls.recoverMediaError();
          } else {
            setError('Playback error');
          }
        }
      });

      hls.loadSource(src);
      hls.attachMedia(video);

    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Safari native HLS
      video.src = src;
      if (startTime > 0) video.currentTime = startTime;
    } else {
      // Direct video (mp4, etc)
      video.src = src;
      if (startTime > 0) video.currentTime = startTime;
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [src, startTime]);

  // Progress tracking
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !onProgress) return;

    const interval = setInterval(() => {
      if (!video.paused && video.currentTime > 0) {
        onProgress(video.currentTime, video.duration || 0);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [onProgress]);

  return (
    <div className="relative w-full">
      <div className="w-full aspect-video bg-black rounded-xl overflow-hidden">
        {error ? (
          <div className="w-full h-full flex items-center justify-center text-red-500">
            <p>{error}</p>
          </div>
        ) : (
          <video
            ref={videoRef}
            className="w-full h-full"
            controls
            playsInline
            poster={poster}
            onPlay={onPlay}
            onPause={() => {
              const v = videoRef.current;
              if (v) onProgress?.(v.currentTime, v.duration || 0);
              onPause?.();
            }}
            onEnded={() => {
              const v = videoRef.current;
              if (v) onProgress?.(v.duration || 0, v.duration || 0);
              onEnded?.();
            }}
          >
            {subtitles.map((track, i) => (
              <track
                key={i}
                src={track.src}
                kind="subtitles"
                label={track.label}
                srcLang={track.srclang}
              />
            ))}
          </video>
        )}
      </div>

      <div className="flex flex-wrap gap-3 mt-4">
        {isMobile && (
          <>
            <button
              onClick={() => { window.location.href = `vlc://${src}`; }}
              className="flex-1 min-w-[120px] flex items-center justify-center gap-2 px-4 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium"
            >
              <ExternalLink className="w-5 h-5" />
              VLC
            </button>
            <button
              onClick={() => { window.location.href = `intent:${src}#Intent;type=video/*;end`; }}
              className="flex-1 min-w-[120px] flex items-center justify-center gap-2 px-4 py-3 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg font-medium"
            >
              <Smartphone className="w-5 h-5" />
              External
            </button>
          </>
        )}
        <button
          onClick={() => { navigator.clipboard.writeText(src); alert('Copied!'); }}
          className="flex-1 min-w-[120px] px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm"
        >
          Copy URL
        </button>
      </div>
    </div>
  );
}

export default VideoPlayer;
