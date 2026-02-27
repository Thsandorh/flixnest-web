import React, { useRef, useEffect, forwardRef, useState, useCallback } from 'react';
import Hls from 'hls.js';
import { FaPlay } from 'react-icons/fa';
import LoadingSpinnerVideoPlayer from '../loading/loading-spiner-video-player';
import Image from 'next/image';

type VideoPlayerProps = {
  videoUrl: string;
  thumbnail: string;
  videoProgress: number | null;
};

const VideoPlayer = forwardRef<HTMLVideoElement, VideoPlayerProps>(
  ({ videoUrl, thumbnail, videoProgress }, videoRef) => {
    const overlay = useRef<HTMLDivElement | null>(null);
    const [isCanPlay, setIsCanPlay] = useState<boolean>(false);
    const resolvedVideoRef = videoRef && 'current' in videoRef ? videoRef : null;

    const handleCanPlayThrough = useCallback((video: HTMLVideoElement | null) => {
      setIsCanPlay(true);
      if (video && videoProgress) {
        video.play();
        overlay.current?.classList.add('hidden');
      }
    }, [videoProgress]);

    useEffect(() => {
      if (!videoUrl) return;

      const video = resolvedVideoRef?.current ?? null;
      const currentOverlay = overlay.current;

      if (video) {
        if (Hls.isSupported()) {
          const hls = new Hls();
          hls.loadSource(videoUrl);
          hls.attachMedia(video);
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
          // For Safari and other browsers that support HLS natively
          video.src = videoUrl;
        }

        if (videoProgress) {
          video.currentTime = videoProgress;
        }
      }

      return () => {
        if (video && video.src) {
          video.pause();
          video.removeAttribute('src'); // Stop the video stream
          video.load();
        }

        currentOverlay?.classList.remove('hidden');
      };
    }, [videoUrl, videoProgress, resolvedVideoRef]);

    const handlePlayVideo = () => {
      resolvedVideoRef?.current?.play();
      overlay.current?.classList.add('hidden');
    };

    useEffect(() => {
      const video = resolvedVideoRef?.current ?? null;
      if (!video) return;

      const onCanPlayThrough = () => handleCanPlayThrough(video);
      video.addEventListener('canplaythrough', onCanPlayThrough);

      return () => {
        video.removeEventListener('canplaythrough', onCanPlayThrough);
      };
    }, [handleCanPlayThrough, resolvedVideoRef]);

    return (
      <div className="relative w-full h-[34rem]">
        <video ref={videoRef} controls style={{ width: '100%', height: '100%' }} />
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

// Set a display name for the component
VideoPlayer.displayName = 'VideoPlayer';

export default VideoPlayer;
