import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth-utils';
import { createId, updateDb } from '@/lib/local-db';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { addons, watchlist, history } = await req.json();

    await updateDb((db) => {
      const next = {
        ...db,
        addons: db.addons.filter((item) => item.userId !== user.userId),
        watchlist: db.watchlist.filter((item) => item.userId !== user.userId),
        history: db.history.filter((item) => item.userId !== user.userId),
      };

      const nextAddons = (addons || []).map((a: any) => ({
        id: createId(),
        addonId: a.id,
        name: a.name,
        manifest: a.manifest,
        version: a.version,
        description: a.description,
        types: Array.isArray(a.types) ? a.types : [],
        catalogs: Array.isArray(a.catalogs) ? a.catalogs : [],
        resources: Array.isArray(a.resources) ? a.resources : [],
        isActive: true,
        userId: user.userId,
      }));

      const nextWatchlist = (watchlist || []).map((w: any) => ({
        id: createId(),
        mediaId: w.id,
        type: w.type,
        title: w.title,
        poster: w.poster,
        backdrop: w.backdrop,
        addedAt: typeof w.addedAt === 'number' ? w.addedAt : Date.now(),
        userId: user.userId,
      }));

      const nextHistory = (history || []).map((h: any) => ({
        id: createId(),
        mediaId: h.id,
        type: h.type,
        title: h.title,
        poster: h.poster,
        backdrop: h.backdrop,
        season: h.season,
        episode: h.episode,
        episodeTitle: h.episodeTitle,
        progress: h.progress || 0,
        duration: h.duration || 0,
        lastWatchedAt: typeof h.lastWatchedAt === 'number' ? h.lastWatchedAt : Date.now(),
        watchedEpisodes: h.watchedEpisodes || {},
        userId: user.userId,
      }));

      next.addons = [...next.addons, ...nextAddons];
      next.watchlist = [...next.watchlist, ...nextWatchlist];
      next.history = [...next.history, ...nextHistory];

      return { db: next, result: true };
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Sync error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
