'use client';

import { useEffect, useRef } from 'react';
import { MediaPlayer, MediaProvider } from '@vidstack/react';
import { defaultLayoutIcons, DefaultVideoLayout } from '@vidstack/react/player/layouts/default';
import '@vidstack/react/player/styles/default/theme.css';
import '@vidstack/react/player/styles/default/layouts/video.css';
import { Copy, Share2 } from 'lucide-react';

interface VidstackPlayerProps {
  src: string;
  poster?: string;
  title?: string;
  startTime?: number;
  onProgress?: (currentTime: number, duration: number) => void;
  onEnded?: () => void;
}

export function VidstackPlayer({
  src,
  poster,
  title,
  startTime = 0,
  onProgress,
  onEnded,
}: VidstackPlayerProps) {
  const playerRef = useRef<any>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    console.log('[VidstackPlayer] Loading:', src.substring(0, 150));
  }, [src]);

  // Set start time when video loads
  useEffect(() => {
    if (!playerRef.current || startTime <= 0) return;

    const player = playerRef.current;
    const unsubscribe = player.subscribe(({ currentTime, canPlay }: any) => {
      if (canPlay && currentTime === 0) {
        player.currentTime = startTime;
        unsubscribe();
      }
    });

    return unsubscribe;
  }, [startTime]);

  // Progress tracking
  useEffect(() => {
    if (!playerRef.current || !onProgress) return;

    const player = playerRef.current;

    progressIntervalRef.current = setInterval(() => {
      const state = player.state;
      if (!state.paused && state.duration > 0) {
        onProgress(state.currentTime, state.duration);
      }
    }, 5000);

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [onProgress]);

  // Handle video end
  useEffect(() => {
    if (!playerRef.current || !onEnded) return;

    const player = playerRef.current;
    const unsubscribe = player.subscribe(({ ended }: any) => {
      if (ended) {
        onEnded();
      }
    });

    return unsubscribe;
  }, [onEnded]);

  const handleExternalPlayer = async () => {
    // Try Web Share API first (works on most mobile browsers)
    if (navigator.share) {
      try {
        await navigator.share({
          title: title || 'Play Video',
          url: src,
        });
        return;
      } catch (err) {
        console.log('[VidstackPlayer] Share cancelled or failed:', err);
      }
    }

    // Fallback: Try VLC intent for Android
    const isAndroid = /android/i.test(navigator.userAgent);
    if (isAndroid) {
      // Android Intent to open with any video player
      const intent = `intent://${src.replace(/^https?:\/\//, '')}#Intent;type=video/*;scheme=https;end`;
      window.location.href = intent;
    } else {
      // iOS/Desktop: Try VLC protocol
      window.location.href = `vlc://${src}`;
    }
  };

  return (
    <div className="space-y-4">
      <MediaPlayer
        ref={playerRef}
        src={src}
        poster={poster}
        crossOrigin
        playsInline
        title={title}
        className="w-full aspect-video bg-black rounded-xl overflow-hidden"
      >
        <MediaProvider />
        <DefaultVideoLayout icons={defaultLayoutIcons} />
      </MediaPlayer>

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
          onClick={handleExternalPlayer}
          className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm transition-colors"
        >
          <Share2 className="w-4 h-4" /> Open in External Player
        </button>
      </div>
    </div>
  );
}

export default VidstackPlayer;
