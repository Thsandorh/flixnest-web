'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import Hls from 'hls.js';
import { Play, Pause, Volume2, VolumeX, Maximize, ExternalLink, Copy, AlertTriangle } from 'lucide-react';
import { buildProxyUrl, getVlcProxyHeaders } from '@/lib/stream-utils';

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
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showControls, setShowControls] = useState(true);

  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fatalErrorCountRef = useRef(0);

  const formatTime = (seconds: number) => {
    if (!seconds || !isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Initialize player
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    // Cleanup
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    setIsLoading(true);
    setError(null);
    fatalErrorCountRef.current = 0;

    const isExternal = src.startsWith('http://') || src.startsWith('https://');
    const proxyHeaders = getVlcProxyHeaders(src, headers);
    const finalUrl = isExternal ? buildProxyUrl(src, proxyHeaders) : src;
    console.log('[Player] Original URL:', src.substring(0, 100));
    console.log('[Player] Proxied URL:', finalUrl.substring(0, 150));

    // Try HLS.js for external streams (most vixsrc/vidsrc streams are HLS)
    const useHls = isExternal || src.includes('.m3u8');

    if (useHls && Hls.isSupported()) {
      console.log('[Player] Using HLS.js');

      const hls = new Hls({
        debug: false,
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: 60,
        maxBufferLength: 30,
        startLevel: -1,
      });

      hlsRef.current = hls;

      hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
        console.log('[Player] Manifest OK, levels:', data.levels.length);
        setIsLoading(false);
        if (startTime > 0) video.currentTime = startTime;
        video.play().catch(() => {});
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        console.error('[Player] HLS Error:', data.type, data.details);

        if (data.fatal) {
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
            console.log('[Player] Network error, retrying...');
            fatalErrorCountRef.current += 1;

            if (fatalErrorCountRef.current > 2) {
              console.log('[Player] Too many network errors, giving up.');
              hls.destroy();
              hlsRef.current = null;
              setError('Playback failed - try VLC');
              setIsLoading(false);
              return;
            }

            setTimeout(() => hls.startLoad(), 2000);
          } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
            console.log('[Player] Media error, recovering...');
            hls.recoverMediaError();
          } else {
            // Try direct video as fallback
            console.log('[Player] HLS failed, trying direct...');
            hls.destroy();
            hlsRef.current = null;
            video.src = finalUrl;
            video.load();
            video.play().catch(() => {
              setError('Playback failed - try VLC');
              setIsLoading(false);
            });
          }
        }
      });

      hls.loadSource(finalUrl);
      hls.attachMedia(video);

    } else if (useHls && video.canPlayType('application/vnd.apple.mpegurl')) {
      // Safari native HLS
      console.log('[Player] Safari native HLS');
      video.src = finalUrl;
      video.addEventListener('loadedmetadata', () => {
        setIsLoading(false);
        if (startTime > 0) video.currentTime = startTime;
        video.play().catch(() => {});
      }, { once: true });

    } else {
      // Direct video
      console.log('[Player] Direct video');
      video.src = finalUrl;
      video.addEventListener('loadedmetadata', () => {
        setIsLoading(false);
        if (startTime > 0) video.currentTime = startTime;
      }, { once: true });
      video.addEventListener('error', () => {
        setError('Cannot play this format');
        setIsLoading(false);
      }, { once: true });
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [src, headers, startTime]);

  // Event handlers
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onVideoPlay = () => { setIsPlaying(true); onPlay?.(); };
    const onVideoPause = () => { setIsPlaying(false); onPause?.(); };
    const onTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      if (video.duration) setDuration(video.duration);
    };
    const onVideoEnded = () => { setIsPlaying(false); onEnded?.(); };
    const onWaiting = () => setIsLoading(true);
    const onCanPlay = () => setIsLoading(false);

    video.addEventListener('play', onVideoPlay);
    video.addEventListener('pause', onVideoPause);
    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('ended', onVideoEnded);
    video.addEventListener('waiting', onWaiting);
    video.addEventListener('canplay', onCanPlay);

    return () => {
      video.removeEventListener('play', onVideoPlay);
      video.removeEventListener('pause', onVideoPause);
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('ended', onVideoEnded);
      video.removeEventListener('waiting', onWaiting);
      video.removeEventListener('canplay', onCanPlay);
    };
  }, [onPlay, onPause, onEnded]);

  // Progress reporting
  useEffect(() => {
    if (!onProgress || !duration) return;
    const interval = setInterval(() => {
      if (videoRef.current && !videoRef.current.paused) {
        onProgress(videoRef.current.currentTime, duration);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [onProgress, duration]);

  // Controls visibility
  const showControlsTemporarily = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 3000);
  }, [isPlaying]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (video) video.paused ? video.play().catch(() => {}) : video.pause();
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (video) { video.muted = !video.muted; setIsMuted(video.muted); }
  };

  const seek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (videoRef.current) videoRef.current.currentTime = Number(e.target.value);
  };

  const toggleFullscreen = () => {
    const container = containerRef.current;
    if (container) {
      document.fullscreenElement ? document.exitFullscreen() : container.requestFullscreen();
    }
  };

  return (
    <div className="space-y-4">
      <div
        ref={containerRef}
        className="relative w-full aspect-video bg-black rounded-xl overflow-hidden"
        onMouseMove={showControlsTemporarily}
        onMouseLeave={() => isPlaying && setShowControls(false)}
      >
        <video
          ref={videoRef}
          className="w-full h-full"
          poster={poster}
          playsInline
          onClick={togglePlay}
        >
          {subtitles.map((t, i) => (
            <track key={i} src={t.src} kind="subtitles" label={t.label} srcLang={t.srclang} />
          ))}
        </video>

        {/* Loading */}
        {isLoading && !error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60">
            <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin" />
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 text-white p-4">
            <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
            <p className="text-center mb-4">{error}</p>
            <button
              onClick={() => window.location.href = `vlc://${src}`}
              className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 rounded-lg"
            >
              <ExternalLink className="w-5 h-5" /> Open in VLC
            </button>
          </div>
        )}

        {/* Controls */}
        {!error && (
          <div className={`absolute inset-0 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/80 to-transparent" />

            <button onClick={togglePlay} className="absolute inset-0 flex items-center justify-center">
              <div className="p-4 bg-black/50 rounded-full backdrop-blur-sm hover:bg-black/70">
                {isPlaying ? <Pause className="w-10 h-10 text-white" /> : <Play className="w-10 h-10 text-white ml-1" />}
              </div>
            </button>

            <div className="absolute inset-x-0 bottom-0 p-4 space-y-2">
              <input
                type="range" min={0} max={duration || 100} value={currentTime} onChange={seek}
                className="w-full h-1 bg-white/30 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-red-500 [&::-webkit-slider-thumb]:rounded-full"
              />
              <div className="flex items-center justify-between text-white">
                <div className="flex items-center gap-4">
                  <button onClick={togglePlay}>{isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}</button>
                  <button onClick={toggleMute}>{isMuted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}</button>
                  <span className="text-sm">{formatTime(currentTime)} / {formatTime(duration)}</span>
                </div>
                <button onClick={toggleFullscreen}><Maximize className="w-6 h-6" /></button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <button onClick={() => { navigator.clipboard.writeText(src); alert('Copied!'); }} className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-sm">
          <Copy className="w-4 h-4" /> Copy URL
        </button>
        <button onClick={() => window.location.href = `vlc://${src}`} className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm">
          <ExternalLink className="w-4 h-4" /> Open in VLC
        </button>
      </div>
    </div>
  );
}

export default VideoPlayer;
