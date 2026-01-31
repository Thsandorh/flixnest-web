'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import Hls from 'hls.js';
import { Play, Pause, Volume2, VolumeX, Maximize, ExternalLink, Copy, AlertTriangle } from 'lucide-react';

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

  // Format time
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

    console.log('[Player] Loading:', src);
    setIsLoading(true);
    setError(null);

    // Cleanup previous HLS instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    // Detect if HLS stream
    const isHLS = src.includes('.m3u8') ||
                  src.includes('m3u8') ||
                  src.includes('playlist') ||
                  src.includes('vixsrc') ||
                  src.includes('vidsrc') ||
                  src.includes('vidscr');

    if (isHLS) {
      if (Hls.isSupported()) {
        console.log('[Player] Using HLS.js');

        const hls = new Hls({
          debug: false,
          enableWorker: true,
          lowLatencyMode: false,
          backBufferLength: 60,
          maxBufferLength: 30,
          maxMaxBufferLength: 60,
          startLevel: -1, // Auto quality
          abrEwmaDefaultEstimate: 500000,
        });

        hlsRef.current = hls;

        hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
          console.log('[Player] Manifest parsed, levels:', data.levels.length);
          setIsLoading(false);

          // Start playback
          video.play().catch(e => {
            console.log('[Player] Autoplay blocked:', e.message);
          });
        });

        hls.on(Hls.Events.LEVEL_LOADED, (_, data) => {
          console.log('[Player] Level loaded, duration:', data.details.totalduration);
        });

        hls.on(Hls.Events.ERROR, (_, data) => {
          console.error('[Player] HLS Error:', data.type, data.details);

          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                console.log('[Player] Network error, attempting recovery...');
                hls.startLoad();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                console.log('[Player] Media error, attempting recovery...');
                hls.recoverMediaError();
                break;
              default:
                setError(`Playback failed: ${data.details}`);
                hls.destroy();
                break;
            }
          }
        });

        hls.loadSource(src);
        hls.attachMedia(video);

      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        // Safari native HLS
        console.log('[Player] Using native HLS (Safari)');
        video.src = src;
        video.addEventListener('loadedmetadata', () => {
          setIsLoading(false);
          video.play().catch(() => {});
        }, { once: true });
      } else {
        setError('HLS not supported in this browser');
      }
    } else {
      // Direct video file (MP4, etc.)
      console.log('[Player] Using direct source');
      video.src = src;
      video.addEventListener('loadedmetadata', () => {
        setIsLoading(false);
        if (startTime > 0) video.currentTime = startTime;
      }, { once: true });
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [src, startTime]);

  // Video event handlers
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handlePlay = () => {
      setIsPlaying(true);
      onPlay?.();
    };

    const handlePause = () => {
      setIsPlaying(false);
      onPause?.();
    };

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      if (video.duration) setDuration(video.duration);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      onEnded?.();
    };

    const handleError = () => {
      const err = video.error;
      console.error('[Player] Video error:', err);
      setError(err?.message || 'Video playback error');
      setIsLoading(false);
    };

    const handleWaiting = () => setIsLoading(true);
    const handleCanPlay = () => setIsLoading(false);

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('error', handleError);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('canplay', handleCanPlay);

    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('error', handleError);
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('canplay', handleCanPlay);
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
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 3000);
  }, [isPlaying]);

  // Player actions
  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play().catch(console.error);
    } else {
      video.pause();
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setIsMuted(video.muted);
  };

  const seek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Number(e.target.value);
  };

  const toggleFullscreen = () => {
    const container = containerRef.current;
    if (!container) return;

    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      container.requestFullscreen();
    }
  };

  const copyUrl = () => {
    navigator.clipboard.writeText(src);
    alert('URL copied!');
  };

  const openInVLC = () => {
    window.location.href = `vlc://${src}`;
  };

  return (
    <div className="space-y-4">
      <div
        ref={containerRef}
        className="relative w-full aspect-video bg-black rounded-xl overflow-hidden group"
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

        {/* Loading spinner */}
        {isLoading && !error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin" />
          </div>
        )}

        {/* Error display */}
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-white p-4">
            <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
            <p className="text-center mb-4">{error}</p>
            <button
              onClick={openInVLC}
              className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 rounded-lg"
            >
              <ExternalLink className="w-5 h-5" />
              Open in VLC
            </button>
          </div>
        )}

        {/* Controls overlay */}
        {!error && (
          <div className={`absolute inset-0 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
            {/* Gradient background */}
            <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/80 to-transparent" />

            {/* Play/Pause button center */}
            <button
              onClick={togglePlay}
              className="absolute inset-0 flex items-center justify-center"
            >
              <div className="p-4 bg-black/50 rounded-full backdrop-blur-sm hover:bg-black/70 transition-colors">
                {isPlaying ? (
                  <Pause className="w-10 h-10 text-white" />
                ) : (
                  <Play className="w-10 h-10 text-white ml-1" />
                )}
              </div>
            </button>

            {/* Bottom controls */}
            <div className="absolute inset-x-0 bottom-0 p-4 space-y-2">
              {/* Progress bar */}
              <input
                type="range"
                min={0}
                max={duration || 100}
                value={currentTime}
                onChange={seek}
                className="w-full h-1 bg-white/30 rounded-full appearance-none cursor-pointer
                  [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3
                  [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-red-500
                  [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer"
              />

              {/* Controls row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button onClick={togglePlay} className="text-white hover:text-red-500 transition-colors">
                    {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
                  </button>

                  <button onClick={toggleMute} className="text-white hover:text-red-500 transition-colors">
                    {isMuted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
                  </button>

                  <span className="text-white text-sm">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </span>
                </div>

                <button onClick={toggleFullscreen} className="text-white hover:text-red-500 transition-colors">
                  <Maximize className="w-6 h-6" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Action buttons */}
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
