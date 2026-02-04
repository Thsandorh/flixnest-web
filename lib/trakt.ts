export type TraktMediaType = 'movie' | 'tv';

const TRAKT_API = 'https://api.trakt.tv';
const HISTORY_CACHE_KEY = 'flixnest-trakt-history-v1';
const HISTORY_TTL_MS = 1000 * 60 * 60 * 24 * 7;

interface TraktIds {
  imdb?: string;
  tmdb?: number;
  trakt?: number;
  slug?: string;
}

interface TraktPayload {
  movies?: Array<{ ids: TraktIds }>;
  shows?: Array<{ ids: TraktIds; seasons?: Array<{ number: number; episodes?: Array<{ number: number }> }> }>;
}

const getClientId = () => {
  const clientId = process.env.NEXT_PUBLIC_TRAKT_CLIENT_ID;
  if (!clientId) {
    throw new Error('Missing NEXT_PUBLIC_TRAKT_CLIENT_ID');
  }
  return clientId;
};

const getHeaders = (token?: string) => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'trakt-api-version': '2',
    'trakt-api-key': getClientId(),
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
};

const parseIds = (id: string, imdbId?: string): TraktIds => {
  const normalizedImdb = imdbId?.startsWith('tt') ? imdbId : undefined;
  if (normalizedImdb) return { imdb: normalizedImdb };

  if (id.startsWith('tt')) return { imdb: id };
  const numericId = Number(id);
  if (Number.isFinite(numericId)) return { tmdb: numericId };

  return { slug: id };
};

const buildPayload = (
  type: TraktMediaType,
  ids: TraktIds,
  season?: number,
  episode?: number
): TraktPayload => {
  if (type === 'movie') {
    return { movies: [{ ids }] };
  }

  if (season && episode) {
    return {
      shows: [
        {
          ids,
          seasons: [{ number: season, episodes: [{ number: episode }] }],
        },
      ],
    };
  }

  return { shows: [{ ids }] };
};

const getHistoryCache = () => {
  if (typeof window === 'undefined') return new Map<string, number>();
  try {
    const raw = window.localStorage.getItem(HISTORY_CACHE_KEY);
    if (!raw) return new Map<string, number>();
    const parsed = JSON.parse(raw) as Record<string, number>;
    return new Map(Object.entries(parsed).map(([key, value]) => [key, Number(value)]));
  } catch {
    return new Map<string, number>();
  }
};

const setHistoryCache = (cache: Map<string, number>) => {
  if (typeof window === 'undefined') return;
  try {
    const serialized = JSON.stringify(Object.fromEntries(cache.entries()));
    window.localStorage.setItem(HISTORY_CACHE_KEY, serialized);
  } catch {
    // Ignore storage errors.
  }
};

const shouldSyncHistory = (key: string) => {
  const cache = getHistoryCache();
  const last = cache.get(key);
  return !last || Date.now() - last > HISTORY_TTL_MS;
};

const markHistorySynced = (key: string) => {
  const cache = getHistoryCache();
  cache.set(key, Date.now());
  setHistoryCache(cache);
};

export const syncTraktWatchlist = async (
  token: string,
  item: { id: string; type: TraktMediaType; imdbId?: string },
  action: 'add' | 'remove'
) => {
  const ids = parseIds(item.id, item.imdbId);
  const payload = buildPayload(item.type, ids);
  const endpoint = action === 'add' ? '/sync/watchlist' : '/sync/watchlist/remove';

  await fetch(`${TRAKT_API}${endpoint}`, {
    method: 'POST',
    headers: getHeaders(token),
    body: JSON.stringify(payload),
  });
};

export const syncTraktHistory = async (
  token: string,
  item: { id: string; type: TraktMediaType; imdbId?: string; season?: number; episode?: number }
) => {
  const ids = parseIds(item.id, item.imdbId);
  const payload = buildPayload(item.type, ids, item.season, item.episode);
  await fetch(`${TRAKT_API}/sync/history`, {
    method: 'POST',
    headers: getHeaders(token),
    body: JSON.stringify(payload),
  });
};

export const syncTraktHistoryIfNeeded = async (
  token: string,
  item: { id: string; type: TraktMediaType; imdbId?: string; season?: number; episode?: number },
  progressPercent: number
) => {
  if (progressPercent < 90) return;

  const key = `${item.id}:${item.season ?? 's'}:${item.episode ?? 'e'}`;
  if (!shouldSyncHistory(key)) return;

  await syncTraktHistory(token, item);
  markHistorySynced(key);
};
