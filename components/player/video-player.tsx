'use client';

import { useRef, useEffect, useState } from 'react';
import { ExternalLink } from 'lucide-react';

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
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMobile(/Android|iPhone|iPad|iPod/i.test(navigator.userAgent));
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.src = src;
    video.load();

    if (startTime > 0) {
      video.currentTime = startTime;
    }
  }, [src, startTime]);

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
      </div>

      <div className="flex flex-wrap gap-3 mt-4">
        <button
          onClick={() => {
            if (navigator.share) {
              navigator.share({ title: title || 'Video', url: src });
              return;
            }
            if (isMobile) {
              window.location.href = `intent:${src}#Intent;type=video/*;end`;
              return;
            }
            window.open(src, '_blank');
          }}
          className="flex-1 min-w-[160px] flex items-center justify-center gap-2 px-4 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium"
        >
          <ExternalLink className="w-5 h-5" />
          Open in external player
        </button>
        <button
          onClick={() => { navigator.clipboard.writeText(src); alert('Copied!'); }}
          className="flex-1 min-w-[120px] px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm"
        >
          Copy URL
        </button>
        <button
          onClick={() => { window.open(src, '_blank'); }}
          className="flex-1 min-w-[120px] px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium text-sm"
        >
          Open in Browser
        </button>
      </div>
    </div>
  );
}

export default VideoPlayer;
