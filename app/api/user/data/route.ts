import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth-utils';
import { getDb } from '@/lib/local-db';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const db = await getDb();
    const userData = db.users.find((item) => item.id === user.userId);

    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const addons = db.addons.filter((item) => item.userId === user.userId);
    const watchlist = db.watchlist.filter((item) => item.userId === user.userId);
    const history = db.history.filter((item) => item.userId === user.userId);

    return NextResponse.json({
      addons: addons.map((a) => ({
        ...a,
        types: Array.isArray(a.types) ? a.types : [],
        catalogs: Array.isArray(a.catalogs) ? a.catalogs : [],
        resources: Array.isArray(a.resources) ? a.resources : [],
      })),
      watchlist: watchlist.map((w) => ({
        ...w,
        id: w.mediaId,
        dbId: w.id,
      })),
      history: history.map((h) => ({
        ...h,
        id: h.mediaId,
        dbId: h.id,
        watchedEpisodes: h.watchedEpisodes ?? {},
        lastWatchedAt: typeof h.lastWatchedAt === 'number' ? h.lastWatchedAt : Date.now(),
      })),
    });
  } catch (error) {
    console.error('Fetch user data error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
