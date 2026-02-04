'use client';

import Link from 'next/link';

export default function SettingsPage() {
  return (
    <main className="min-h-screen bg-zinc-950 text-white px-4 md:px-12 py-24">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Beállítások</h1>
          <p className="text-zinc-400">
            Itt tudod kezelni a fiók- és szinkronizációs beállításokat.
          </p>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Trakt</h2>
            <p className="text-sm text-zinc-400 mt-1">
              Kapcsold össze a Trakt fiókod a watchlist és nézési előzmények
              automatikus szinkronizálásához.
            </p>
          </div>
          <div>
            <Link
              href="/trakt"
              className="inline-flex items-center px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 transition"
            >
              Trakt összekötés megnyitása
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
