'use client';

import { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import {
  MediaPlayer,
  MediaProvider,
  type HLSSrc,
  type MediaPlayerInstance,
  type MediaTimeUpdateEvent,
  type MediaDurationChangeEvent,
  type PlayerSrc,
} from '@vidstack/react';
import { DefaultVideoLayout, defaultLayoutIcons } from '@vidstack/react/player/layouts/default';
import { Copy, ExternalLink } from 'lucide-react';

import { buildProxyUrl, buildVlcUrl, getVlcProxyHeaders, isHlsUrl } from '@/lib/stream-utils';

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
  headers,
  startTime = 0,
  onProgress,
  onEnded,
  onPlay,
  onPause,
}: VideoPlayerProps) {
  const playerRef = useRef<MediaPlayerInstance | null>(null);
  const [duration, setDuration] = useState(0);
  const lastProgressRef = useRef(0);

  const isHls = useMemo(() => isHlsUrl(src), [src]);
  const proxyHeaders = useMemo(() => getVlcProxyHeaders(src, headers), [src, headers]);
  const resolvedSrc = useMemo(() => {
    if (!src) return src;

    if (isHls || (proxyHeaders && Object.keys(proxyHeaders).length > 0)) {
      return buildProxyUrl(src, proxyHeaders);
    }

    return src;
  }, [src, isHls, proxyHeaders]);

  const mediaSrc = useMemo<PlayerSrc | undefined>(() => {
    if (!resolvedSrc) return undefined;

    if (isHls) {
      const hlsSrc: HLSSrc = { src: resolvedSrc, type: 'application/x-mpegurl' };
      return hlsSrc;
    }

    return resolvedSrc;
  }, [isHls, resolvedSrc]);

  useEffect(() => {
    if (!playerRef.current || startTime <= 0) return;
    playerRef.current.currentTime = startTime;
  }, [startTime, resolvedSrc]);

  const handleTimeUpdate = useCallback(
    (event: MediaTimeUpdateEvent) => {
      if (!onProgress || duration <= 0) return;
      const currentTime = event.detail.currentTime;
      if (currentTime - lastProgressRef.current >= 5 || currentTime >= duration) {
        lastProgressRef.current = currentTime;
        onProgress(currentTime, duration);
      }
    },
    [onProgress, duration]
  );

  const handleDurationChange = useCallback((event: MediaDurationChangeEvent) => {
    const nextDuration = event.detail || 0;
    if (Number.isFinite(nextDuration)) {
      setDuration(nextDuration);
    }
  }, []);

  const copyUrl = () => {
    navigator.clipboard.writeText(src);
    alert('URL copied!');
  };

  const openInVLC = () => {
    window.location.href = buildVlcUrl(src);
  };

  return (
    <div className="space-y-4">
      <MediaPlayer
        ref={playerRef}
        className="w-full"
        src={mediaSrc}
        poster={poster}
        title={title}
        playsInline
        onTimeUpdate={handleTimeUpdate}
        onDurationChange={handleDurationChange}
        onEnded={onEnded}
        onPlay={onPlay}
        onPause={onPause}
      >
        <MediaProvider>
          {subtitles.map((track, index) => (
            <track
              key={index}
              src={track.src}
              kind="subtitles"
              label={track.label}
              srcLang={track.srclang}
            />
          ))}
        </MediaProvider>
        <DefaultVideoLayout icons={defaultLayoutIcons} />
      </MediaPlayer>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={copyUrl}
          className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-sm"
        >
          <Copy className="w-4 h-4" />
          Copy URL
        </button>
        <button
          onClick={openInVLC}
          className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm"
        >
          <ExternalLink className="w-4 h-4" />
          Open in VLC
        </button>
      </div>
    </div>
  );
}

export default VideoPlayer;
