const API_BASE = (process.env.NEXT_PUBLIC_API_DOMAIN || '').replace(/\/+$/, '');
let hasWarnedMissingApiBase = false;

const ensureApiBase = () => {
  if (!API_BASE && !hasWarnedMissingApiBase) {
    hasWarnedMissingApiBase = true;
    console.error('Missing env NEXT_PUBLIC_API_DOMAIN. Movie API requests are disabled.');
  }
  return API_BASE;
};

const fetchJsonOrFallback = async (path: string, fallback: any, cache: RequestCache = 'no-store') => {
  const base = ensureApiBase();
  if (!base) return fallback;

  try {
    const res = await fetch(`${base}${path}`, { cache });
    if (!res.ok) return fallback;
    return res.json();
  } catch {
    return fallback;
  }
};

const MovieServices = {
  getNewlyMovies: async (page = 1) => {
    return fetchJsonOrFallback(`/danh-sach/phim-moi-cap-nhat?page=${page}`, { items: [] });
  },
  getSingleMovies: async (page = 1) => {
    return fetchJsonOrFallback(`/v1/api/danh-sach/phim-le?page=${page}`, { data: { items: [] } });
  },
  getTVSeries: async (page = 1) => {
    return fetchJsonOrFallback(`/v1/api/danh-sach/phim-bo?page=${page}`, { data: { items: [] } });
  },
  getCartoonMovies: async (page = 1) => {
    return fetchJsonOrFallback(`/v1/api/danh-sach/hoat-hinh?page=${page}`, { data: { items: [] } });
  },
  getTVShows: async (page = 1) => {
    return fetchJsonOrFallback(`/v1/api/danh-sach/tv-shows?page=${page}`, { data: { items: [] } });
  },
  getDetailMovie: async (slug: string) => {
    return fetchJsonOrFallback(`/phim/${slug}`, { movie: null, episodes: [] }, 'no-store');
  },
  getMovieImages: async (slug: string) => {
    return fetchJsonOrFallback(`/phim/${slug}/images`, { data: [] }, 'no-store');
  },
  getMoviesFormat: async (slug: string, page: number) => {
    return fetchJsonOrFallback(`/v1/api/danh-sach/${slug}?page=${page}`, { data: { items: [] } }, 'no-store');
  },
  getMoviesType: async (slug: string, page: number) => {
    return fetchJsonOrFallback(`/v1/api/the-loai/${slug}?page=${page}`, { data: { items: [] } }, 'no-store');
  },
  getMoviesCountry: async (slug: string, page: number) => {
    return fetchJsonOrFallback(`/v1/api/quoc-gia/${slug}?page=${page}`, { data: { items: [] }, status: 'error' }, 'no-store');
  },
  searchMovie: async (slug: string) => {
    return fetchJsonOrFallback(`/v1/api/tim-kiem?keyword=${slug}&limit=15`, { data: { items: [] } }, 'no-store');
  },
};

export default MovieServices;
