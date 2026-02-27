const TMDB_API_BASE = 'https://api.themoviedb.org/3';
const TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY || process.env.TMDB_API_KEY || '';
const TMDB_ACCESS_TOKEN = process.env.NEXT_PUBLIC_TMDB_ACCESS_TOKEN || '';

const buildTmdbUrl = (path: string) => {
  const endpoint = new URL(`${TMDB_API_BASE}${path}`);
  if (TMDB_API_KEY && !endpoint.searchParams.has('api_key')) {
    endpoint.searchParams.set('api_key', TMDB_API_KEY);
  }
  return endpoint.toString();
};

const TMDBServices = {
  getCredits: async (movieId: number, type: string) => {
    const path = `/${type}/${movieId}/credits?language=en-US`;

    const tryRequest = async (url: string, headers: Record<string, string>) => {
      try {
        const res = await fetch(url, {
          method: 'GET',
          headers,
        });
        if (!res.ok) return null;
        return await res.json();
      } catch {
        return null;
      }
    };

    if (TMDB_API_KEY) {
      const byApiKey = await tryRequest(buildTmdbUrl(path), { accept: 'application/json' });
      if (byApiKey) return byApiKey;
    }

    if (TMDB_ACCESS_TOKEN) {
      const byBearer = await tryRequest(`${TMDB_API_BASE}${path}`, {
        accept: 'application/json',
        Authorization: `Bearer ${TMDB_ACCESS_TOKEN}`,
      });
      if (byBearer) return byBearer;
    }

    return { cast: [], crew: [] };
  },
};

export default TMDBServices;
