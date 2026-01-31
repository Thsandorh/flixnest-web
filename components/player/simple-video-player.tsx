'use client';

import { useRef, useEffect } from 'react';
import { ExternalLink, Copy } from 'lucide-react';

interface SimpleVideoPlayerProps {
  src: string;
  poster?: string;
  title?: string;
  startTime?: number;
  onProgress?: (currentTime: number, duration: number) => void;
  onEnded?: () => void;
}

export function SimpleVideoPlayer({
  src,
  poster,
  title,
  startTime = 0,
  onProgress,
  onEnded,
}: SimpleVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Set start time when video loads
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    const handleLoadedMetadata = () => {
      if (startTime > 0) {
        video.currentTime = startTime;
      }
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    return () => video.removeEventListener('loadedmetadata', handleLoadedMetadata);
  }, [src, startTime]);

  // Progress tracking
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !onProgress) return;

    const updateProgress = () => {
      if (!video.paused && video.duration) {
        onProgress(video.currentTime, video.duration);
      }
    };

    progressIntervalRef.current = setInterval(updateProgress, 5000);
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [onProgress]);

  // Handle video end
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !onEnded) return;

    video.addEventListener('ended', onEnded);
    return () => video.removeEventListener('ended', onEnded);
  }, [onEnded]);

  return (
    <div className="space-y-4">
      <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden">
        <video
          ref={videoRef}
          src={src}
          poster={poster}
          controls
          controlsList="nodownload"
          playsInline
          autoPlay
          className="w-full h-full"
          crossOrigin="anonymous"
        >
          {title && <track kind="metadata" label={title} />}
        </video>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => {
            navigator.clipboard.writeText(src);
            alert('URL copied to clipboard!');
          }}
          className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-sm transition-colors"
        >
          <Copy className="w-4 h-4" /> Copy URL
        </button>
        <button
          onClick={() => (window.location.href = `vlc://${src}`)}
          className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm transition-colors"
        >
          <ExternalLink className="w-4 h-4" /> Open in VLC
        </button>
      </div>
    </div>
  );
}

export default SimpleVideoPlayer;
