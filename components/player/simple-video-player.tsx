'use client';

import { useRef, useEffect, useState } from 'react';
import Hls from 'hls.js';
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
  const hlsRef = useRef<Hls | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Initialize HLS player or native playback
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    // Cleanup previous HLS instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    setError(null);
    const isM3U8 = src.includes('.m3u8');

    console.log('[SimplePlayer] Source:', src.substring(0, 100));
    console.log('[SimplePlayer] Is M3U8:', isM3U8);

    // For M3U8 streams, use HLS.js on Chrome/Firefox, native on Safari/iOS
    if (isM3U8) {
      if (Hls.isSupported()) {
        console.log('[SimplePlayer] Using HLS.js for M3U8');
        const hls = new Hls({
          debug: false,
          enableWorker: true,
          maxBufferLength: 30,
        });

        hlsRef.current = hls;
        hls.loadSource(src);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          console.log('[SimplePlayer] Manifest loaded, playing...');
          video.play().catch((e) => console.warn('[SimplePlayer] Autoplay prevented:', e));
        });

        hls.on(Hls.Events.ERROR, (_, data) => {
          console.error('[SimplePlayer] HLS Error:', data.type, data.details);
          if (data.fatal) {
            setError('Playback error - try VLC');
          }
        });

      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        console.log('[SimplePlayer] Using native HLS (Safari/iOS)');
        video.src = src;
      } else {
        console.error('[SimplePlayer] HLS not supported');
        setError('Your browser does not support HLS playback');
      }
    } else {
      console.log('[SimplePlayer] Using native playback');
      video.src = src;
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [src]);

  // Set start time when video loads
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      if (startTime > 0) {
        video.currentTime = startTime;
      }
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    return () => video.removeEventListener('loadedmetadata', handleLoadedMetadata);
  }, [startTime]);

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

        {/* Error overlay */}
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 text-white p-4">
            <p className="text-center mb-4">{error}</p>
            <button
              onClick={() => (window.location.href = `vlc://${src}`)}
              className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 rounded-lg"
            >
              <ExternalLink className="w-5 h-5" /> Open in VLC
            </button>
          </div>
        )}
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
