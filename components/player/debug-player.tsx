'use client';

import { useRef, useEffect, useState } from 'react';
import Hls from 'hls.js';
import { Copy, Share2, AlertCircle } from 'lucide-react';

interface DebugPlayerProps {
  src: string;
  poster?: string;
  title?: string;
  streamHeaders?: Record<string, string>;
  behaviorHints?: any;
}

export function DebugPlayer({ src, poster, title, streamHeaders, behaviorHints }: DebugPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const addLog = (message: string) => {
    setLogs((prev) => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
    console.log(`[DebugPlayer] ${message}`);
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    setError(null);
    setLogs([]);

    addLog(`Source: ${src.substring(0, 80)}...`);

    // Log stream metadata
    if (streamHeaders && Object.keys(streamHeaders).length > 0) {
      addLog(`📋 Stream Headers: ${JSON.stringify(streamHeaders)}`);
    } else {
      addLog(`📋 Stream Headers: none`);
    }

    if (behaviorHints) {
      addLog(`🔧 Behavior Hints: ${JSON.stringify(behaviorHints)}`);
    } else {
      addLog(`🔧 Behavior Hints: none`);
    }

    const isM3U8 = src.includes('.m3u8');
    addLog(`Is M3U8: ${isM3U8}`);

    if (isM3U8) {
      if (Hls.isSupported()) {
        addLog('HLS.js is supported, initializing...');

        const hls = new Hls({
          debug: true,
          enableWorker: true,
          xhrSetup: (xhr, url) => {
            xhr.withCredentials = false;
            addLog(`Loading: ${url.substring(0, 80)}`);
          },
        });

        hlsRef.current = hls;

        hls.on(Hls.Events.MANIFEST_LOADING, () => {
          addLog('📥 Loading manifest...');
        });

        hls.on(Hls.Events.MANIFEST_LOADED, (_, data) => {
          addLog(`✅ Manifest loaded! Levels: ${data.levels.length}`);
        });

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          addLog('✅ Manifest parsed successfully!');
          video.play().catch((e) => {
            addLog(`❌ Autoplay blocked: ${e.message}`);
          });
        });

        hls.on(Hls.Events.LEVEL_LOADED, (_, data) => {
          addLog(`📊 Level loaded: ${data.details.totalduration}s`);
        });

        hls.on(Hls.Events.FRAG_LOADING, (_, data) => {
          addLog(`📦 Loading fragment ${data.frag.sn}`);
        });

        hls.on(Hls.Events.ERROR, (_, data) => {
          const errorMsg = `❌ ${data.type} - ${data.details}`;
          addLog(errorMsg);

          if (data.fatal) {
            setError(`Fatal error: ${data.details}`);
            addLog(`💀 Fatal error: ${data.details}`);

            if (data.response) {
              addLog(`Response code: ${data.response.code}`);
              addLog(`Response text: ${data.response.text?.substring(0, 100)}`);
            }
          }
        });

        hls.loadSource(src);
        hls.attachMedia(video);

      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        addLog('Using native HLS (Safari/iOS)');
        video.src = src;

        video.addEventListener('loadeddata', () => addLog('✅ Video loaded'));
        video.addEventListener('error', (e) => {
          addLog(`❌ Video error: ${e}`);
          setError('Native video error');
        });
      } else {
        addLog('❌ HLS not supported in this browser');
        setError('HLS not supported');
      }
    } else {
      addLog('Using direct video playback');
      video.src = src;
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [src]);

  const handleExternalPlayer = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: title || 'Video', url: src });
        return;
      } catch (err) {
        console.log('Share cancelled');
      }
    }

    const isAndroid = /android/i.test(navigator.userAgent);
    if (isAndroid) {
      const intent = `intent://${src.replace(/^https?:\/\//, '')}#Intent;type=video/*;scheme=https;end`;
      window.location.href = intent;
    } else {
      window.location.href = `vlc://${src}`;
    }
  };

  return (
    <div className="space-y-4">
      <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden">
        <video
          ref={videoRef}
          poster={poster}
          controls
          playsInline
          className="w-full h-full"
          crossOrigin="anonymous"
        />

        {error && (
          <div className="absolute top-4 left-4 right-4 bg-red-900/90 text-white p-3 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold">Playback Error</p>
                <p className="text-sm mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-zinc-900 rounded-lg p-4 max-h-60 overflow-y-auto">
        <h3 className="text-white font-semibold mb-2">Debug Log:</h3>
        <div className="space-y-1 font-mono text-xs">
          {logs.map((log, i) => (
            <div key={i} className="text-zinc-300">
              {log}
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => {
            navigator.clipboard.writeText(src);
            alert('URL copied!');
          }}
          className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-sm"
        >
          <Copy className="w-4 h-4" /> Copy URL
        </button>
        <button
          onClick={handleExternalPlayer}
          className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm"
        >
          <Share2 className="w-4 h-4" /> External Player
        </button>
        <button
          onClick={() => window.open(src, '_blank')}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm"
        >
          Open Direct Link
        </button>
      </div>
    </div>
  );
}

export default DebugPlayer;
