import { NextRequest, NextResponse } from 'next/server';

type KitsuMeta = {
  id?: string;
  kitsu_id?: string;
  name?: string;
  aliases?: string[];
  type?: string;
};

const normalize = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const scoreMeta = (meta: KitsuMeta, query: string) => {
  const q = normalize(query);
  if (!q) return 0;

  const names = [meta.name || '', ...(meta.aliases || [])].map(normalize).filter(Boolean);
  let best = 0;

  for (const candidate of names) {
    if (candidate === q) best = Math.max(best, 100);
    else if (candidate.startsWith(q)) best = Math.max(best, 85);
    else if (candidate.includes(q)) best = Math.max(best, 70);
    else if (q.includes(candidate) && candidate.length >= 4) best = Math.max(best, 60);
  }

  return best;
};

const encodeSearchSegment = (value: string) => encodeURIComponent(value).replace(/%20/g, '+');

export async function GET(request: NextRequest) {
  try {
    const title = (request.nextUrl.searchParams.get('title') || '').trim();
    const limitRaw = request.nextUrl.searchParams.get('limit');
    const limit = Math.min(Math.max(Number(limitRaw || '5') || 5, 1), 20);

    if (!title) {
      return NextResponse.json(
        { error: "Missing query param: 'title'" },
        { status: 400 }
      );
    }

    const baseUrl = process.env.KITSU_CATALOG_BASE_URL || 'https://anime-kitsu.strem.fun';
    const endpoint = `${baseUrl.replace(/\/+$/, '')}/catalog/anime/kitsu-anime-list/search=${encodeSearchSegment(
      title
    )}.json`;

    const response = await fetch(endpoint, {
      method: 'GET',
      headers: { accept: 'application/json' },
      cache: 'no-store',
    });

    if (!response.ok) {
      return NextResponse.json(
        {
          error: 'Kitsu catalog request failed',
          endpoint,
          status: response.status,
          statusText: response.statusText,
        },
        { status: 502 }
      );
    }

    const payload = (await response.json()) as { metas?: KitsuMeta[] };
    const metas = Array.isArray(payload?.metas) ? payload.metas : [];

    const ranked = metas
      .map((meta) => {
        const rawId = String(meta.id || '').trim();
        const kitsuId = meta.kitsu_id || (rawId.startsWith('kitsu:') ? rawId.slice(6) : '');
        return {
          id: rawId,
          kitsuId,
          name: meta.name || '',
          type: meta.type || '',
          score: scoreMeta(meta, title),
        };
      })
      .filter((item) => item.kitsuId)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    const best = ranked[0] || null;

    return NextResponse.json(
      {
        ok: true,
        title,
        endpoint,
        count: ranked.length,
        kitsuId: best?.kitsuId || '',
        best,
        results: ranked,
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Unexpected error',
        detail: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
