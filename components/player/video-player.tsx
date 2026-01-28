'use client';

import { useRef, useEffect, useState } from 'react';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';
import { ExternalLink, Smartphone } from 'lucide-react';
import { motion } from 'framer-motion';
import Player from 'video.js/dist/types/player';

interface SubtitleTrack {
  src: string;
  label: string;
  srclang: string;
}

interface VideoPlayerProps {
  src: string;
  poster?: string;
  title?: string;
  subtitles?: SubtitleTrack[];
  headers?: Record<string, string>;
  startTime?: number;
  onProgress?: (currentTime: number, duration: number) => void;
  onEnded?: () => void;
  onPlay?: () => void;
  onPause?: () => void;
}

function proxyUrl(url: string, headers?: Record<string, string>): string {
  if (url.startsWith('/api/proxy')) {
    return url;
  }
  const params = new URLSearchParams();
  params.set('url', url);
  if (headers && Object.keys(headers).length > 0) {
    params.set('headers', JSON.stringify(headers));
  }
  return `/api/proxy?${params.toString()}`;
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
  const containerRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<Player | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastProgressRef = useRef<number>(0);
  const [debugLogs, setDebugLogs] = useState<string[]>([]);

  const callbacksRef = useRef({ onProgress, onEnded, onPlay, onPause });
  callbacksRef.current = { onProgress, onEnded, onPlay, onPause };

  const addLog = (msg: string) => {
    setDebugLogs(prev => [...prev.slice(-10), `${new Date().toLocaleTimeString()}: ${msg}`]);
  };

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
          navigator.userAgent
        ) || window.innerWidth < 768
      );
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Initialize Video.js
  useEffect(() => {
    if (!containerRef.current) return;

    // Clear any existing content
    containerRef.current.innerHTML = '';

    addLog('Initializing Video.js...');

    let finalUrl = src;
    if (/^https?:\/\//i.test(finalUrl)) {
      finalUrl = proxyUrl(finalUrl, headers);
    }
    addLog(`URL: ${finalUrl.substring(0, 80)}...`);

    const videoElement = document.createElement('video');
    videoElement.classList.add('video-js', 'vjs-big-play-centered', 'vjs-fluid');
    containerRef.current.appendChild(videoElement);

    const player = videojs(videoElement, {
      controls: true,
      autoplay: false,
      preload: 'auto',
      fluid: true,
      responsive: true,
      playbackRates: [0.5, 1, 1.25, 1.5, 2],
      html5: {
        vhs: {
          overrideNative: true,
        },
        nativeAudioTracks: false,
        nativeVideoTracks: false,
      },
      sources: [{
        src: finalUrl,
        type: 'application/x-mpegURL',
      }],
      poster: poster,
    });

    playerRef.current = player;

    subtitles.forEach((track, index) => {
      player.addRemoteTextTrack({
        kind: 'subtitles',
        src: track.src,
        srclang: track.srclang,
        label: track.label,
        default: track.srclang === 'en' && index === 0,
      }, false);
    });

    player.on('loadedmetadata', () => {
      addLog('Metadata loaded');
      if (startTime > 0) player.currentTime(startTime);
    });

    player.on('play', () => {
      addLog('Playing');
      callbacksRef.current.onPlay?.();
    });

    player.on('pause', () => {
      const currentTime = player.currentTime() || 0;
      const duration = player.duration() || 0;
      if (currentTime > 0) {
        callbacksRef.current.onProgress?.(currentTime, duration);
        callbacksRef.current.onPause?.();
      }
    });

    player.on('ended', () => {
      addLog('Ended');
      const duration = player.duration() || 0;
      callbacksRef.current.onProgress?.(duration, duration);
      callbacksRef.current.onEnded?.();
    });

    player.on('error', () => {
      const error = player.error();
      addLog(`Error: ${error?.code} - ${error?.message}`);
    });

    progressIntervalRef.current = setInterval(() => {
      if (playerRef.current && !playerRef.current.paused()) {
        const currentTime = playerRef.current.currentTime() || 0;
        const duration = playerRef.current.duration() || 0;
        if (Math.abs(currentTime - lastProgressRef.current) >= 5) {
          lastProgressRef.current = currentTime;
          callbacksRef.current.onProgress?.(currentTime, duration);
        }
      }
    }, 5000);

    addLog('Ready');

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
      if (playerRef.current) {
        playerRef.current.dispose();
        playerRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  return (
    <div className="relative w-full">
      <div className="w-full aspect-video bg-black rounded-xl overflow-hidden">
        <div ref={containerRef} data-vjs-player />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-wrap gap-3 mt-4"
      >
        {isMobile && (
          <>
            <button
              onClick={() => { window.location.href = `vlc://${src}`; }}
              className="flex-1 min-w-[120px] flex items-center justify-center gap-2 px-4 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-colors"
            >
              <ExternalLink className="w-5 h-5" />
              Open in VLC
            </button>
            <button
              onClick={() => { window.location.href = `intent:${src}#Intent;type=video/*;end`; }}
              className="flex-1 min-w-[120px] flex items-center justify-center gap-2 px-4 py-3 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg font-medium transition-colors"
            >
              <Smartphone className="w-5 h-5" />
              External Player
            </button>
          </>
        )}
        <button
          onClick={() => { navigator.clipboard.writeText(src); alert('Copied!'); }}
          className="flex-1 min-w-[120px] flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors text-sm"
        >
          Copy URL
        </button>
        <button
          onClick={() => { window.open(src, '_blank'); }}
          className="flex-1 min-w-[120px] flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors text-sm"
        >
          Test in Browser
        </button>
      </motion.div>

      {debugLogs.length > 0 && (
        <div className="mt-4 p-3 bg-zinc-900 rounded-lg text-xs font-mono text-green-400 max-h-48 overflow-y-auto">
          <div className="font-bold text-white mb-2">Debug:</div>
          {debugLogs.map((log, i) => (
            <div key={i} className="break-all">{log}</div>
          ))}
        </div>
      )}
    </div>
  );
}

export default VideoPlayer;
