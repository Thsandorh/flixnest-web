'use client';

import Link from 'next/link';
import { useEffect } from 'react';

type Props = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function WatchPageError({ error, reset }: Props) {
  useEffect(() => {
    console.error('Watch page client error:', error);
  }, [error]);

  return (
    <div className="min-h-[70vh] px-4 py-16 flex items-center justify-center">
      <div className="w-full max-w-xl rounded-2xl border border-red-400/30 bg-zinc-900/80 p-6 lg:p-8 text-center space-y-4">
        <h1 className="text-xl lg:text-2xl font-semibold text-white">Playback page crashed</h1>
        <p className="text-sm lg:text-base text-zinc-300">
          The watch page hit a client error inside APK WebView. Please retry or go back to the movie page.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={reset}
            className="rounded-md bg-white text-black px-4 py-2 text-sm font-medium hover:bg-zinc-200 transition-colors"
          >
            Retry watch page
          </button>
          <Link
            href="/"
            className="rounded-md border border-white/20 px-4 py-2 text-sm font-medium text-white hover:bg-white/10 transition-colors"
          >
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
