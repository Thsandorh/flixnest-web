'use client';

import { useRef, useEffect, useState } from 'react';
import Hls from 'hls.js';
import { ExternalLink, Smartphone } from 'lucide-react';
import { motion } from 'framer-motion';

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
  if (url.startsWith('/api/proxy')) return url;
  const params = new URLSearchParams();
  params.set('url', url);
  if (headers && Object.keys(headers).length > 0) {
    params.set('headers', JSON.stringify(headers));
  }
  return `/api/proxy?${params.toString()}`;
}

// Detect if URL is likely an HLS stream
function isLikelyHls(url: string): boolean {
  const lower = url.toLowerCase();
  if (lower.includes('.m3u8')) return true;
  if (lower.includes('playlist')) return true;
  if (lower.includes('/hls/')) return true;
  // Common streaming domains that use HLS
  if (lower.includes('vixsrc') || lower.includes('fsl-cdn')) return true;
  return false;
}

// Detect if URL is a direct video file
function isDirectVideo(url: string): boolean {
  const lower = url.toLowerCase();
  return lower.includes('.mp4') || lower.includes('.webm') || lower.includes('.mkv') || lower.includes('.avi');
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
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastProgressRef = useRef<number>(0);
  const [debugLogs, setDebugLogs] = useState<string[]>([]);

  const callbacksRef = useRef({ onProgress, onEnded, onPlay, onPause });
  callbacksRef.current = { onProgress, onEnded, onPlay, onPause };

  const addLog = (msg: string) => {
    setDebugLogs(prev => [...prev.slice(-15), `${new Date().toLocaleTimeString()}: ${msg}`]);
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

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Cleanup previous
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    video.src = '';

    addLog('Setting up player...');
    addLog(`Source: ${src.substring(0, 60)}...`);

    const isHls = isLikelyHls(src);
    const isDirect = isDirectVideo(src);

    // For direct video files (mp4, etc), try without proxy first
    if (isDirect) {
      addLog('Direct video file detected');
      video.src = src;
      video.load();
      return;
    }

    // For HLS streams
    if (isHls) {
      if (Hls.isSupported()) {
        addLog('Using HLS.js');

        // Try direct URL first, fall back to proxy if needed
        const tryWithUrl = (url: string, isProxy: boolean) => {
          const hls = new Hls({
            debug: false,
            enableWorker: true,
            lowLatencyMode: false,
            backBufferLength: 90,
            maxBufferLength: 30,
            maxMaxBufferLength: 600,
            xhrSetup: (xhr) => {
              // Add headers if needed
              if (headers) {
                Object.entries(headers).forEach(([key, value]) => {
                  xhr.setRequestHeader(key, value);
                });
              }
            },
          });
          hlsRef.current = hls;

          hls.on(Hls.Events.MANIFEST_PARSED, (_event, data) => {
            addLog(`Manifest OK, ${data.levels.length} levels`);
            if (startTime > 0) video.currentTime = startTime;
          });

          hls.on(Hls.Events.FRAG_LOADED, () => {
            addLog('Fragment loaded');
          });

          hls.on(Hls.Events.ERROR, (_event, data) => {
            addLog(`HLS Error: ${data.type} - ${data.details}`);

            if (data.fatal) {
              if (!isProxy && data.type === Hls.ErrorTypes.NETWORK_ERROR) {
                // Try with proxy
                addLog('Trying with proxy...');
                hls.destroy();
                hlsRef.current = null;
                tryWithUrl(proxyUrl(src, headers), true);
              } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
                addLog('Recovering from media error...');
                hls.recoverMediaError();
              } else {
                addLog('Fatal error');
              }
            }
          });

          addLog(`Loading: ${isProxy ? 'via proxy' : 'direct'}`);
          hls.loadSource(url);
          hls.attachMedia(video);
        };

        // Start with direct URL
        tryWithUrl(src, false);

      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        // Safari native HLS
        addLog('Using Safari native HLS');
        video.src = src;
        video.load();
      } else {
        addLog('HLS not supported!');
      }
    } else {
      // Unknown format - try direct, then proxy
      addLog('Unknown format, trying direct...');
      video.src = src;
      video.load();
    }

    // Progress tracking
    progressIntervalRef.current = setInterval(() => {
      if (video && !video.paused && video.currentTime > 0) {
        if (Math.abs(video.currentTime - lastProgressRef.current) >= 5) {
          lastProgressRef.current = video.currentTime;
          callbacksRef.current.onProgress?.(video.currentTime, video.duration || 0);
        }
      }
    }, 5000);

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  const handlePlay = () => {
    addLog('Playing');
    callbacksRef.current.onPlay?.();
  };

  const handlePause = () => {
    const video = videoRef.current;
    if (video && video.currentTime > 0) {
      callbacksRef.current.onProgress?.(video.currentTime, video.duration || 0);
      callbacksRef.current.onPause?.();
    }
  };

  const handleEnded = () => {
    addLog('Ended');
    const video = videoRef.current;
    if (video) {
      callbacksRef.current.onProgress?.(video.duration || 0, video.duration || 0);
      callbacksRef.current.onEnded?.();
    }
  };

  const handleLoadedMetadata = () => {
    addLog('Metadata loaded');
    const video = videoRef.current;
    if (video && startTime > 0) {
      video.currentTime = startTime;
    }
  };

  const handleError = () => {
    const video = videoRef.current;
    if (video?.error) {
      addLog(`Video error: ${video.error.code} - ${video.error.message || 'unknown'}`);
    }
  };

  return (
    <div className="relative w-full">
      <div className="w-full aspect-video bg-black rounded-xl overflow-hidden">
        <video
          ref={videoRef}
          className="w-full h-full"
          controls
          playsInline
          poster={poster}
          crossOrigin="anonymous"
          onPlay={handlePlay}
          onPause={handlePause}
          onEnded={handleEnded}
          onLoadedMetadata={handleLoadedMetadata}
          onError={handleError}
        >
          {subtitles.map((track, index) => (
            <track
              key={`${track.srclang}-${index}`}
              src={track.src}
              kind="subtitles"
              label={track.label}
              srcLang={track.srclang}
              default={track.srclang === 'en' && index === 0}
            />
          ))}
        </video>
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
