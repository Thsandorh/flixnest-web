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
    const headers: Record<string, string> = { accept: 'application/json' };
    if (!TMDB_API_KEY && TMDB_ACCESS_TOKEN) {
      headers.Authorization = `Bearer ${TMDB_ACCESS_TOKEN}`;
    }

    const res = await fetch(buildTmdbUrl(`/${type}/${movieId}/credits?language=en-US`), {
      method: 'GET',
      headers,
    });
    return res.json();
  },
};

export default TMDBServices;
