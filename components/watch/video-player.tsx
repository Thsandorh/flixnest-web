import React, { useRef, useEffect, forwardRef, useState, useCallback } from 'react';
import Hls from 'hls.js';
import { FaPlay } from 'react-icons/fa';
import LoadingSpinnerVideoPlayer from '../loading/loading-spiner-video-player';
import Image from 'next/image';

type VideoPlayerProps = {
  videoUrl: string;
  thumbnail: string;
  videoProgress: number | null;
  onPlaybackError?: () => void;
};

const VideoPlayer = forwardRef<HTMLVideoElement, VideoPlayerProps>(
  ({ videoUrl, thumbnail, videoProgress, onPlaybackError }, videoRef) => {
    const overlay = useRef<HTMLDivElement | null>(null);
    const hlsRef = useRef<Hls | null>(null);
    const [isCanPlay, setIsCanPlay] = useState<boolean>(false);
    const resolvedVideoRef = videoRef && 'current' in videoRef ? videoRef : null;

    const hideOverlay = useCallback(() => {
      overlay.current?.classList.add('hidden');
    }, []);

    const revealOverlay = useCallback(() => {
      overlay.current?.classList.remove('hidden');
    }, []);

    const attemptPlay = useCallback((video: HTMLVideoElement | null) => {
      if (!video) return;
      const playPromise = video.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(() => {
          // Ignore autoplay rejections on mobile; user interaction will start playback.
        });
      }
    }, []);

    const handleReady = useCallback(
      (video: HTMLVideoElement | null) => {
        setIsCanPlay(true);
        if (video && videoProgress) {
          attemptPlay(video);
          hideOverlay();
        }
      },
      [attemptPlay, hideOverlay, videoProgress]
    );

    useEffect(() => {
      if (!videoUrl) return;

      const video = resolvedVideoRef?.current ?? null;
      setIsCanPlay(false);

      if (video) {
        let sourceAttached = false;

        if (Hls.isSupported()) {
          const hls = new Hls();
          hlsRef.current = hls;
          hls.loadSource(videoUrl);
          hls.attachMedia(video);
          sourceAttached = true;

          hls.on(Hls.Events.ERROR, (_event, data) => {
            if (data?.fatal) {
              onPlaybackError?.();
            }
          });
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
          // Safari and some mobile WebViews can play HLS natively.
          video.src = videoUrl;
          sourceAttached = true;
        }

        if (!sourceAttached) {
          onPlaybackError?.();
        }

        if (videoProgress) {
          video.currentTime = videoProgress;
        }
      }

      return () => {
        hlsRef.current?.destroy();
        hlsRef.current = null;
        if (video && video.src) {
          video.pause();
          video.removeAttribute('src');
          video.load();
        }

        revealOverlay();
      };
    }, [onPlaybackError, revealOverlay, videoUrl, videoProgress, resolvedVideoRef]);

    const handlePlayVideo = () => {
      attemptPlay(resolvedVideoRef?.current ?? null);
      hideOverlay();
    };

    useEffect(() => {
      const video = resolvedVideoRef?.current ?? null;
      if (!video) return;

      const onReady = () => handleReady(video);
      const onPlaying = hideOverlay;
      const onError = () => onPlaybackError?.();

      video.addEventListener('canplay', onReady);
      video.addEventListener('canplaythrough', onReady);
      video.addEventListener('loadeddata', onReady);
      video.addEventListener('playing', onPlaying);
      video.addEventListener('error', onError);

      return () => {
        video.removeEventListener('canplay', onReady);
        video.removeEventListener('canplaythrough', onReady);
        video.removeEventListener('loadeddata', onReady);
        video.removeEventListener('playing', onPlaying);
        video.removeEventListener('error', onError);
      };
    }, [handleReady, hideOverlay, onPlaybackError, resolvedVideoRef]);

    return (
      <div className="relative w-full h-[34rem]">
        <video
          ref={videoRef}
          controls
          playsInline
          preload="metadata"
          poster={thumbnail}
          style={{ width: '100%', height: '100%' }}
        />
        <div ref={overlay} className="absolute inset-0 bg-black flex items-center justify-center">
          <Image src={thumbnail} alt="" fill className="object-center object-cover" unoptimized />
          {isCanPlay ? (
            <FaPlay
              className="absolute cursor-pointer z-10 hover:scale-125 transition-all duration-200"
              size={40}
              onClick={handlePlayVideo}
            />
          ) : (
            <LoadingSpinnerVideoPlayer />
          )}
          <div className="bg-red-600 absolute inset-0 opacity-5"></div>
        </div>
      </div>
    );
  }
);

VideoPlayer.displayName = 'VideoPlayer';

export default VideoPlayer;
