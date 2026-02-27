const LEGACY_API_BASE = (process.env.NEXT_PUBLIC_API_DOMAIN || '').replace(/\/+$/, '');
const TMDB_ACCESS_TOKEN = process.env.NEXT_PUBLIC_TMDB_ACCESS_TOKEN || '';
const TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY || process.env.TMDB_API_KEY || '';
const TMDB_API_BASE = 'https://api.themoviedb.org/3';
const KITSU_CATALOG_BASE = (process.env.KITSU_CATALOG_BASE_URL || 'https://anime-kitsu.strem.fun').replace(
  /\/+$/,
  ''
);

let hasWarnedMissingLegacyBase = false;
let hasWarnedMissingTmdbAuth = false;

const TMDB_GENRE_SLUG_MAP: Record<string, string> = {
  action: 'hanh-dong',
  adventure: 'phieu-luu',
  animation: 'hoat-hinh',
  comedy: 'hai-huoc',
  crime: 'bi-an',
  documentary: 'tai-lieu',
  drama: 'chinh-kich',
  family: 'gia-dinh',
  fantasy: 'than-thoai',
  history: 'co-trang',
  horror: 'kinh-di',
  mystery: 'bi-an',
  romance: 'tinh-cam',
  'science fiction': 'vien-tuong',
  'sci-fi & fantasy': 'vien-tuong',
  thriller: 'tam-ly',
  war: 'co-trang',
  western: 'co-trang',
  music: 'am-nhac',
};

const TYPE_SLUG_TO_GENRE_IDS: Record<string, { movie: number[]; tv: number[] }> = {
  'hanh-dong': { movie: [28], tv: [10759] },
  'co-trang': { movie: [36, 10752], tv: [10768] },
  'vien-tuong': { movie: [878], tv: [10765] },
  'kinh-di': { movie: [27], tv: [9648] },
  'tai-lieu': { movie: [99], tv: [99] },
  'bi-an': { movie: [9648, 80], tv: [9648, 80] },
  'phim-18': { movie: [10749], tv: [10749] },
  'tinh-cam': { movie: [10749], tv: [10749] },
  'tam-ly': { movie: [53, 18], tv: [18] },
  'the-thao': { movie: [99], tv: [10764] },
  'phieu-luu': { movie: [12], tv: [10759] },
  'am-nhac': { movie: [10402], tv: [10767] },
  'gia-dinh': { movie: [10751], tv: [10751] },
  'hoc-duong': { movie: [35], tv: [18] },
  'hai-huoc': { movie: [35], tv: [35] },
  'vo-thuat': { movie: [28], tv: [10759] },
  'khoa-hoc': { movie: [99, 878], tv: [99] },
  'than-thoai': { movie: [14], tv: [10765] },
  'chinh-kich': { movie: [18], tv: [18] },
  'kinh-dien': { movie: [18], tv: [18] },
};

const COUNTRY_SLUG_TO_CODES: Record<string, string[]> = {
  'trung-quoc': ['CN'],
  'han-quoc': ['KR'],
  'nhat-ban': ['JP'],
  'thai-lan': ['TH'],
  'au-my': ['US', 'GB'],
  'dai-loan': ['TW'],
  'hong-kong': ['HK'],
  'an-do': ['IN'],
  anh: ['GB'],
  phap: ['FR'],
  canada: ['CA'],
  duc: ['DE'],
  'tay-ban-nha': ['ES'],
  'tho-nhi-ky': ['TR'],
  'ha-lan': ['NL'],
  indonesia: ['ID'],
  nga: ['RU'],
  mexico: ['MX'],
  'ba-lan': ['PL'],
  uc: ['AU'],
  'thuy-dien': ['SE'],
  malaysia: ['MY'],
  brazil: ['BR'],
  philippines: ['PH'],
  'bo-dao-nha': ['PT'],
  y: ['IT'],
  'dan-mach': ['DK'],
  uae: ['AE'],
  'na-uy': ['NO'],
  'thuy-si': ['CH'],
  'nam-phi': ['ZA'],
  ukraina: ['UA'],
  'a-rap-xe-ut': ['SA'],
};

const COUNTRY_CODE_MAP: Record<string, { name: string; slug: string }> = {
  CN: { name: 'China', slug: 'trung-quoc' },
  KR: { name: 'South Korea', slug: 'han-quoc' },
  JP: { name: 'Japan', slug: 'nhat-ban' },
  TH: { name: 'Thailand', slug: 'thai-lan' },
  US: { name: 'United States', slug: 'au-my' },
  GB: { name: 'United Kingdom', slug: 'anh' },
  TW: { name: 'Taiwan', slug: 'dai-loan' },
  HK: { name: 'Hong Kong', slug: 'hong-kong' },
  IN: { name: 'India', slug: 'an-do' },
  FR: { name: 'France', slug: 'phap' },
  CA: { name: 'Canada', slug: 'canada' },
  DE: { name: 'Germany', slug: 'duc' },
  ES: { name: 'Spain', slug: 'tay-ban-nha' },
  TR: { name: 'Turkey', slug: 'tho-nhi-ky' },
  NL: { name: 'Netherlands', slug: 'ha-lan' },
  ID: { name: 'Indonesia', slug: 'indonesia' },
  RU: { name: 'Russia', slug: 'nga' },
  MX: { name: 'Mexico', slug: 'mexico' },
  PL: { name: 'Poland', slug: 'ba-lan' },
  AU: { name: 'Australia', slug: 'uc' },
  SE: { name: 'Sweden', slug: 'thuy-dien' },
  MY: { name: 'Malaysia', slug: 'malaysia' },
  BR: { name: 'Brazil', slug: 'brazil' },
  PH: { name: 'Philippines', slug: 'philippines' },
  PT: { name: 'Portugal', slug: 'bo-dao-nha' },
  IT: { name: 'Italy', slug: 'y' },
  DK: { name: 'Denmark', slug: 'dan-mach' },
  AE: { name: 'UAE', slug: 'uae' },
  NO: { name: 'Norway', slug: 'na-uy' },
  CH: { name: 'Switzerland', slug: 'thuy-si' },
  ZA: { name: 'South Africa', slug: 'nam-phi' },
  UA: { name: 'Ukraine', slug: 'ukraina' },
  SA: { name: 'Saudi Arabia', slug: 'a-rap-xe-ut' },
};

const slugify = (input: string) =>
  input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'untitled';

const parseYear = (input?: string | null) => {
  if (!input) return 0;
  const year = Number(String(input).slice(0, 4));
  return Number.isFinite(year) ? year : 0;
};

const normalizeLanguage = (input?: string | null) =>
  String(input || 'EN').trim().slice(0, 2).toUpperCase() || 'EN';

const movieSlugFromTmdb = (name: string, mediaType: 'movie' | 'tv', id: number | string) =>
  `${slugify(name)}-tmdb-${mediaType}-${id}`;

const movieSlugFromKitsu = (name: string, kitsuId: string) => `${slugify(name)}-kitsu-${kitsuId}`;

const mapCountryCodes = (codes: string[]) => {
  const unique = Array.from(new Set(codes.map((code) => String(code || '').toUpperCase()).filter(Boolean)));
  return unique.map((code) => {
    const known = COUNTRY_CODE_MAP[code];
    if (known) return { id: code, name: known.name, slug: known.slug };
    return { id: code, name: code, slug: slugify(code) };
  });
};

const mapGenres = (genres: Array<{ id: number | string; name: string }>) =>
  genres.map((genre) => {
    const name = String(genre?.name || '').trim();
    const slug = TMDB_GENRE_SLUG_MAP[name.toLowerCase()] || slugify(name);
    return { id: String(genre?.id || slug), name: name || 'Unknown', slug };
  });

const ensureLegacyBase = () => {
  if (!LEGACY_API_BASE && !hasWarnedMissingLegacyBase) {
    hasWarnedMissingLegacyBase = true;
    console.error('Missing env NEXT_PUBLIC_API_DOMAIN. Falling back to TMDB/Kitsu catalog mode.');
  }
  return LEGACY_API_BASE;
};

const ensureTmdbAuth = () => {
  if (!TMDB_API_KEY && !TMDB_ACCESS_TOKEN && !hasWarnedMissingTmdbAuth) {
    hasWarnedMissingTmdbAuth = true;
    console.error('Missing TMDB auth env. Set NEXT_PUBLIC_TMDB_API_KEY or NEXT_PUBLIC_TMDB_ACCESS_TOKEN.');
  }
  return {
    apiKey: TMDB_API_KEY,
    accessToken: TMDB_ACCESS_TOKEN,
  };
};

const fetchJson = async (url: string, init?: RequestInit) => {
  try {
    const response = await fetch(url, init);
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
};

const fetchLegacy = async (path: string, fallback: any, cache: RequestCache = 'no-store') => {
  const base = ensureLegacyBase();
  if (!base) return fallback;

  const payload = await fetchJson(`${base}${path}`, { cache });
  return payload ?? fallback;
};

const buildTmdbUrl = (path: string, apiKey: string) => {
  const endpoint = new URL(`${TMDB_API_BASE}${path}`);
  if (apiKey && !endpoint.searchParams.has('api_key')) {
    endpoint.searchParams.set('api_key', apiKey);
  }
  return endpoint.toString();
};

const fetchTmdb = async (path: string, fallback: any, cache: RequestCache = 'no-store') => {
  const { apiKey, accessToken } = ensureTmdbAuth();
  if (!apiKey && !accessToken) return fallback;

  const tryRequest = async (url: string, headers: Record<string, string>) => {
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers,
        cache,
      });

      if (!response.ok) {
        return { ok: false, status: response.status, payload: null as any };
      }

      return { ok: true, status: response.status, payload: await response.json() };
    } catch {
      return { ok: false, status: 0, payload: null as any };
    }
  };

  if (apiKey) {
    const byApiKey = await tryRequest(buildTmdbUrl(path, apiKey), { accept: 'application/json' });
    if (byApiKey.ok) return byApiKey.payload;

    // Some keys can be stale/misconfigured in env while bearer still works.
    if (accessToken) {
      const byBearer = await tryRequest(`${TMDB_API_BASE}${path}`, {
        accept: 'application/json',
        Authorization: `Bearer ${accessToken}`,
      });
      if (byBearer.ok) return byBearer.payload;
    }

    return fallback;
  }

  const byBearerOnly = await tryRequest(`${TMDB_API_BASE}${path}`, {
    accept: 'application/json',
    Authorization: `Bearer ${accessToken}`,
  });

  return byBearerOnly.ok ? byBearerOnly.payload : fallback;
};

const fetchKitsu = async (path: string, fallback: any, cache: RequestCache = 'no-store') => {
  const payload = await fetchJson(`${KITSU_CATALOG_BASE}${path}`, {
    method: 'GET',
    headers: { accept: 'application/json' },
    cache,
  });
  return payload ?? fallback;
};

const buildTmdbImageUrl = (path: string | null | undefined, size: string) => {
  const cleanPath = String(path || '').trim();
  if (!cleanPath) return '';
  if (cleanPath.startsWith('http://') || cleanPath.startsWith('https://')) return cleanPath;

  const configured = (process.env.NEXT_PUBLIC_TMDB_IMG_DOMAIN || 'https://image.tmdb.org').replace(/\/+$/, '');
  const base = configured.includes('/t/p') ? configured : `${configured}/t/p`;
  const normalizedPath = cleanPath.startsWith('/') ? cleanPath : `/${cleanPath}`;
  return `${base}/${size}${normalizedPath}`;
};

const buildBaseMovie = (overrides: Record<string, any>) => ({
  _id: String(overrides._id || ''),
  name: String(overrides.name || ''),
  slug: String(overrides.slug || ''),
  origin_name: String(overrides.origin_name || overrides.name || ''),
  poster_url: String(overrides.poster_url || ''),
  thumb_url: String(overrides.thumb_url || ''),
  year: Number(overrides.year || 0),
  tmdb: {
    type: String(overrides.tmdb?.type || 'movie'),
    id: String(overrides.tmdb?.id || ''),
    season: Number(overrides.tmdb?.season || 1),
    vote_average: Number(overrides.tmdb?.vote_average || 0),
    vote_count: Number(overrides.tmdb?.vote_count || 0),
  },
  type: String(overrides.type || 'single'),
  sub_docquyen: Boolean(overrides.sub_docquyen),
  chieurap: Boolean(overrides.chieurap),
  time: String(overrides.time || 'Updating'),
  episode_current: String(overrides.episode_current || 'Updating'),
  quality: String(overrides.quality || 'HD'),
  lang: String(overrides.lang || 'EN'),
  category: Array.isArray(overrides.category) ? overrides.category : [],
  country: Array.isArray(overrides.country) ? overrides.country : [],
  actor: Array.isArray(overrides.actor) ? overrides.actor : [],
  director: Array.isArray(overrides.director) ? overrides.director : [],
  content: String(overrides.content || ''),
  trailer_url: String(overrides.trailer_url || ''),
});

const buildEpisodeList = (count: number) => {
  const safeCount = Math.min(Math.max(Number(count || 1), 1), 200);
  return [
    {
      server_name: 'FlixNest',
      server_data: Array.from({ length: safeCount }, (_, index) => ({
        name: String(index + 1),
        slug: `episode-${index + 1}`,
        filename: `Episode ${index + 1}`,
        link_embed: '',
        link_m3u8: '',
      })),
    },
  ];
};

const buildSingleEpisodeList = () => [
  {
    server_name: 'FlixNest',
    server_data: [
      {
        name: 'Full',
        slug: 'full',
        filename: 'Full movie',
        link_embed: '',
        link_m3u8: '',
      },
    ],
  },
];

const buildEmptyDetail = (slug: string) => ({
  movie: buildBaseMovie({
    _id: slug,
    slug,
    name: 'Unavailable',
    origin_name: 'Unavailable',
    type: 'single',
    episode_current: 'Updating',
    content: 'This title is currently unavailable.',
    tmdb: { type: 'movie', id: '', season: 1, vote_average: 0, vote_count: 0 },
  }),
  episodes: buildSingleEpisodeList(),
});

let genreLookupCache: { movie: Record<number, string>; tv: Record<number, string> } | null = null;

const getGenreLookup = async () => {
  if (genreLookupCache) return genreLookupCache;

  const [movieGenresPayload, tvGenresPayload] = await Promise.all([
    fetchTmdb('/genre/movie/list?language=en-US', { genres: [] }),
    fetchTmdb('/genre/tv/list?language=en-US', { genres: [] }),
  ]);

  const movieGenres = Array.isArray(movieGenresPayload?.genres) ? movieGenresPayload.genres : [];
  const tvGenres = Array.isArray(tvGenresPayload?.genres) ? tvGenresPayload.genres : [];

  genreLookupCache = {
    movie: Object.fromEntries(movieGenres.map((genre: any) => [Number(genre.id), String(genre.name || '')])),
    tv: Object.fromEntries(tvGenres.map((genre: any) => [Number(genre.id), String(genre.name || '')])),
  };

  return genreLookupCache;
};

const mapGenreIdsToObjects = (
  ids: Array<number | string> | undefined,
  mediaType: 'movie' | 'tv',
  lookup: { movie: Record<number, string>; tv: Record<number, string> }
) => {
  const values = Array.isArray(ids) ? ids : [];
  const source = mediaType === 'movie' ? lookup.movie : lookup.tv;

  return mapGenres(
    values
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value) && value > 0)
      .map((value) => ({ id: value, name: source[value] || `Genre ${value}` }))
  );
};

const mapTmdbListItemToMovie = (
  item: any,
  mediaType: 'movie' | 'tv',
  lookup: { movie: Record<number, string>; tv: Record<number, string> }
) => {
  const title = mediaType === 'movie' ? item?.title || item?.name : item?.name || item?.title;
  const originName =
    mediaType === 'movie'
      ? item?.original_title || title
      : item?.original_name || title;
  const yearSource = mediaType === 'movie' ? item?.release_date : item?.first_air_date;

  return buildBaseMovie({
    _id: String(item?.id || ''),
    name: String(title || 'Untitled'),
    slug: movieSlugFromTmdb(String(title || `title-${item?.id || ''}`), mediaType, item?.id || ''),
    origin_name: String(originName || title || ''),
    poster_url: buildTmdbImageUrl(item?.backdrop_path || item?.poster_path, 'original'),
    thumb_url: buildTmdbImageUrl(item?.poster_path || item?.backdrop_path, 'w500'),
    year: parseYear(yearSource),
    tmdb: {
      type: mediaType,
      id: String(item?.id || ''),
      season: 1,
      vote_average: Number(item?.vote_average || 0),
      vote_count: Number(item?.vote_count || 0),
    },
    type: mediaType === 'movie' ? 'single' : 'series',
    time: 'Updating',
    episode_current: mediaType === 'movie' ? 'Full movie' : 'Ongoing',
    quality: 'HD',
    lang: normalizeLanguage(item?.original_language),
    category: mapGenreIdsToObjects(item?.genre_ids, mediaType, lookup),
    country: mapCountryCodes(Array.isArray(item?.origin_country) ? item.origin_country : []),
    actor: [],
    director: [],
    content: String(item?.overview || 'Description is being updated.'),
    trailer_url: '',
  });
};

const mapKitsuMetaToMovie = (meta: any) => {
  const rawId = String(meta?.kitsu_id || '').trim() || String(meta?.id || '').replace('kitsu:', '').trim();
  const title = String(meta?.name || 'Untitled');
  const mediaType = String(meta?.type || '').toLowerCase() === 'movie' ? 'movie' : 'tv';
  const parsedGenres = Array.isArray(meta?.genres)
    ? meta.genres.map((name: string, index: number) => ({ id: String(index + 1), name: String(name || ''), slug: slugify(String(name || 'genre')) }))
    : [];

  return buildBaseMovie({
    _id: `kitsu:${rawId}`,
    name: title,
    slug: movieSlugFromKitsu(title, rawId),
    origin_name: Array.isArray(meta?.aliases) && meta.aliases[0] ? String(meta.aliases[0]) : title,
    poster_url: String(meta?.background || meta?.poster || ''),
    thumb_url: String(meta?.poster || meta?.background || ''),
    year: parseYear(String(meta?.releaseInfo || '')),
    tmdb: {
      type: mediaType,
      id: '',
      season: 1,
      vote_average: Number(meta?.imdbRating || 0),
      vote_count: 0,
    },
    type: mediaType === 'movie' ? 'single' : 'series',
    time: 'Updating',
    episode_current: mediaType === 'movie' ? 'Full movie' : 'Ongoing',
    quality: 'HD',
    lang: 'JA',
    category: [{ id: 'anime', name: 'Anime', slug: 'hoat-hinh' }, ...parsedGenres],
    country: [{ id: 'JP', name: 'Japan', slug: 'nhat-ban' }],
    actor: [],
    director: [],
    content: String(meta?.description || 'Description is being updated.'),
    trailer_url: '',
  });
};

const uniqueMovies = (items: any[]) => {
  const seen = new Set<string>();
  const output: any[] = [];

  for (const item of items) {
    const key = String(item?._id || item?.slug || '');
    if (!key || seen.has(key)) continue;
    seen.add(key);
    output.push(item);
  }

  return output;
};

const fetchKitsuCatalogMovies = async (catalogId: string, page: number) => {
  const skip = Math.max((page - 1) * 20, 0);
  const payload = await fetchKitsu(`/catalog/anime/${catalogId}/skip=${skip}.json`, { metas: [] });
  const metas = Array.isArray(payload?.metas) ? payload.metas : [];
  return metas.map(mapKitsuMetaToMovie);
};

const fetchTmdbMovies = async (page: number, extra = '') => {
  const lookup = await getGenreLookup();
  const payload = await fetchTmdb(
    `/discover/movie?include_adult=false&include_video=false&language=en-US&page=${page}&sort_by=popularity.desc${extra}`,
    { results: [] }
  );
  const results = Array.isArray(payload?.results) ? payload.results : [];
  return results.map((item: any) => mapTmdbListItemToMovie(item, 'movie', lookup));
};

const fetchTmdbTv = async (page: number, extra = '') => {
  const lookup = await getGenreLookup();
  const payload = await fetchTmdb(
    `/discover/tv?include_adult=false&include_null_first_air_dates=false&language=en-US&page=${page}&sort_by=popularity.desc${extra}`,
    { results: [] }
  );
  const results = Array.isArray(payload?.results) ? payload.results : [];
  return results.map((item: any) => mapTmdbListItemToMovie(item, 'tv', lookup));
};

const resolveTmdbSourceFromSlug = (slug: string) => {
  const tmdbMatch = slug.match(/-tmdb-(movie|tv)-(\d+)$/);
  if (tmdbMatch) {
    return { source: 'tmdb' as const, mediaType: tmdbMatch[1] as 'movie' | 'tv', id: Number(tmdbMatch[2]) };
  }

  const kitsuMatch = slug.match(/-kitsu-(\d+)$/);
  if (kitsuMatch) {
    return { source: 'kitsu' as const, mediaType: 'tv' as const, id: Number(kitsuMatch[1]) };
  }

  return null;
};

const buildTrailerUrl = (videos: any[]) => {
  const list = Array.isArray(videos) ? videos : [];
  const trailer =
    list.find((item) => item?.site === 'YouTube' && item?.type === 'Trailer' && item?.official) ||
    list.find((item) => item?.site === 'YouTube' && item?.type === 'Trailer') ||
    list.find((item) => item?.site === 'YouTube');

  if (!trailer?.key) return '';
  return `https://www.youtube.com/watch?v=${trailer.key}`;
};

const buildTmdbDetailMovie = async (mediaType: 'movie' | 'tv', id: number) => {
  const detail = await fetchTmdb(
    `/${mediaType}/${id}?append_to_response=videos,credits&language=en-US`,
    null,
    'no-store'
  );

  if (!detail?.id) {
    return null;
  }

  const title = mediaType === 'movie' ? detail.title || detail.name : detail.name || detail.title;
  const originName =
    mediaType === 'movie' ? detail.original_title || title : detail.original_name || title;

  let seasonNumber = 1;
  let seriesEpisodeCount = 1;

  if (mediaType === 'tv') {
    const seasons = Array.isArray(detail?.seasons) ? detail.seasons : [];
    const preferredSeason =
      seasons.find((season: any) => Number(season?.season_number) > 0 && Number(season?.episode_count) > 0) ||
      seasons.find((season: any) => Number(season?.episode_count) > 0) ||
      null;

    if (preferredSeason) {
      seasonNumber = Number(preferredSeason.season_number || 1) || 1;
      seriesEpisodeCount = Number(preferredSeason.episode_count || 1) || 1;
    }

    const seasonDetail = await fetchTmdb(
      `/tv/${id}/season/${seasonNumber}?language=en-US`,
      { episodes: [] },
      'no-store'
    );
    const seasonEpisodes = Array.isArray(seasonDetail?.episodes) ? seasonDetail.episodes : [];
    if (seasonEpisodes.length > 0) {
      seriesEpisodeCount = seasonEpisodes.length;
    }
  }

  const credits = detail?.credits || {};
  const crew = Array.isArray(credits?.crew) ? credits.crew : [];
  const cast = Array.isArray(credits?.cast) ? credits.cast : [];

  const directors = Array.from(
    new Set(
      crew
        .filter((item: any) => item?.job === 'Director' || item?.department === 'Directing')
        .map((item: any) => String(item?.name || '').trim())
        .filter(Boolean)
    )
  ).slice(0, 8);

  const actors = Array.from(
    new Set(cast.map((item: any) => String(item?.name || '').trim()).filter(Boolean))
  ).slice(0, 20);

  const runtimeValue =
    mediaType === 'movie'
      ? Number(detail?.runtime || 0)
      : Number(Array.isArray(detail?.episode_run_time) ? detail.episode_run_time[0] : 0);

  const categories = mapGenres(Array.isArray(detail?.genres) ? detail.genres : []);

  const productionCountries = Array.isArray(detail?.production_countries)
    ? detail.production_countries
    : [];
  const countries =
    productionCountries.length > 0
      ? productionCountries.map((country: any) => ({
          id: String(country?.iso_3166_1 || ''),
          name: String(country?.name || country?.iso_3166_1 || 'Unknown'),
          slug: COUNTRY_CODE_MAP[String(country?.iso_3166_1 || '').toUpperCase()]?.slug || slugify(String(country?.name || country?.iso_3166_1 || 'country')),
        }))
      : mapCountryCodes(Array.isArray(detail?.origin_country) ? detail.origin_country : []);

  const movie = buildBaseMovie({
    _id: String(detail.id),
    name: String(title || 'Untitled'),
    slug: movieSlugFromTmdb(String(title || `title-${detail.id}`), mediaType, detail.id),
    origin_name: String(originName || title || ''),
    poster_url: buildTmdbImageUrl(detail?.backdrop_path || detail?.poster_path, 'original'),
    thumb_url: buildTmdbImageUrl(detail?.poster_path || detail?.backdrop_path, 'w500'),
    year: parseYear(mediaType === 'movie' ? detail?.release_date : detail?.first_air_date),
    tmdb: {
      type: mediaType,
      id: String(detail.id),
      season: seasonNumber,
      vote_average: Number(detail?.vote_average || 0),
      vote_count: Number(detail?.vote_count || 0),
    },
    type: mediaType === 'movie' ? 'single' : 'series',
    time: runtimeValue > 0 ? `${runtimeValue} min` : 'Updating',
    episode_current: mediaType === 'movie' ? 'Full movie' : `Season ${seasonNumber}`,
    quality: 'HD',
    lang: normalizeLanguage(detail?.original_language),
    category: categories,
    country: countries,
    actor: actors,
    director: directors,
    content: String(detail?.overview || 'Description is being updated.'),
    trailer_url: buildTrailerUrl(Array.isArray(detail?.videos?.results) ? detail.videos.results : []),
  });

  const episodes = mediaType === 'movie' ? buildSingleEpisodeList() : buildEpisodeList(seriesEpisodeCount);

  return { movie, episodes };
};

const buildKitsuDetailMovie = async (kitsuId: number) => {
  const payload = await fetchKitsu(`/meta/anime/kitsu:${kitsuId}.json`, { meta: null }, 'no-store');
  const meta = payload?.meta;
  if (!meta) return null;

  const mapped = mapKitsuMetaToMovie(meta);
  const trailers = Array.isArray(meta?.trailers) ? meta.trailers : [];
  const trailerSource = trailers.find((item: any) => item?.source)?.source;

  const movie = buildBaseMovie({
    ...mapped,
    _id: `kitsu:${kitsuId}`,
    slug: movieSlugFromKitsu(String(meta?.name || `anime-${kitsuId}`), String(kitsuId)),
    trailer_url: trailerSource ? `https://www.youtube.com/watch?v=${trailerSource}` : '',
    category: mapped.category.some((item: any) => String(item?.name).toLowerCase() === 'anime')
      ? mapped.category
      : [{ id: 'anime', name: 'Anime', slug: 'hoat-hinh' }, ...mapped.category],
    content: String(meta?.description || mapped.content || 'Description is being updated.'),
  });

  const isMovie = movie.type === 'single';
  return {
    movie,
    episodes: isMovie ? buildSingleEpisodeList() : buildEpisodeList(24),
  };
};

const resolveTmdbDetailFromSearch = async (slug: string) => {
  const query = slug.replace(/[-_]+/g, ' ').trim();
  if (!query) return null;

  const payload = await fetchTmdb(
    `/search/multi?query=${encodeURIComponent(query)}&include_adult=false&language=en-US&page=1`,
    { results: [] },
    'no-store'
  );

  const first = Array.isArray(payload?.results)
    ? payload.results.find((item: any) => item?.media_type === 'movie' || item?.media_type === 'tv')
    : null;

  if (!first?.id || !first?.media_type) return null;
  return buildTmdbDetailMovie(first.media_type, Number(first.id));
};

const MovieServices = {
  getNewlyMovies: async (page = 1) => {
    if (LEGACY_API_BASE) {
      return fetchLegacy(`/danh-sach/phim-moi-cap-nhat?page=${page}`, { items: [] });
    }

    const lookup = await getGenreLookup();
    const payload = await fetchTmdb(`/trending/all/day?language=en-US&page=${page}`, { results: [] });
    const items = (Array.isArray(payload?.results) ? payload.results : [])
      .filter((item: any) => item?.media_type === 'movie' || item?.media_type === 'tv')
      .map((item: any) => mapTmdbListItemToMovie(item, item.media_type, lookup));

    return { items };
  },

  getSingleMovies: async (page = 1) => {
    if (LEGACY_API_BASE) {
      return fetchLegacy(`/v1/api/danh-sach/phim-le?page=${page}`, { data: { items: [] } });
    }

    const items = await fetchTmdbMovies(page);
    return { data: { items } };
  },

  getTVSeries: async (page = 1) => {
    if (LEGACY_API_BASE) {
      return fetchLegacy(`/v1/api/danh-sach/phim-bo?page=${page}`, { data: { items: [] } });
    }

    const items = await fetchTmdbTv(page);
    return { data: { items } };
  },

  getCartoonMovies: async (page = 1) => {
    if (LEGACY_API_BASE) {
      return fetchLegacy(`/v1/api/danh-sach/hoat-hinh?page=${page}`, { data: { items: [] } });
    }

    const [tmdbMovieAnimation, tmdbTvAnimation, kitsuPopular] = await Promise.all([
      fetchTmdbMovies(page, '&with_genres=16'),
      fetchTmdbTv(page, '&with_genres=16'),
      fetchKitsuCatalogMovies('kitsu-anime-popular', page),
    ]);

    const items = uniqueMovies([...kitsuPopular, ...tmdbTvAnimation, ...tmdbMovieAnimation]);
    return { data: { items } };
  },

  getTVShows: async (page = 1) => {
    if (LEGACY_API_BASE) {
      return fetchLegacy(`/v1/api/danh-sach/tv-shows?page=${page}`, { data: { items: [] } });
    }

    const lookup = await getGenreLookup();
    const payload = await fetchTmdb(`/trending/tv/day?language=en-US&page=${page}`, { results: [] });
    const items = (Array.isArray(payload?.results) ? payload.results : []).map((item: any) =>
      mapTmdbListItemToMovie(item, 'tv', lookup)
    );

    return { data: { items } };
  },

  getDetailMovie: async (slug: string) => {
    if (LEGACY_API_BASE) {
      return fetchLegacy(`/phim/${slug}`, buildEmptyDetail(slug), 'no-store');
    }

    const source = resolveTmdbSourceFromSlug(slug);
    if (source?.source === 'tmdb') {
      const detail = await buildTmdbDetailMovie(source.mediaType, source.id);
      return detail || buildEmptyDetail(slug);
    }

    if (source?.source === 'kitsu') {
      const detail = await buildKitsuDetailMovie(source.id);
      return detail || buildEmptyDetail(slug);
    }

    const detailFromSearch = await resolveTmdbDetailFromSearch(slug);
    return detailFromSearch || buildEmptyDetail(slug);
  },

  getMovieImages: async (slug: string) => {
    if (LEGACY_API_BASE) {
      return fetchLegacy(`/phim/${slug}/images`, { data: { images: [] } }, 'no-store');
    }

    const source = resolveTmdbSourceFromSlug(slug);
    if (!source || source.source !== 'tmdb') {
      return { data: { images: [] } };
    }

    const payload = await fetchTmdb(
      `/${source.mediaType}/${source.id}/images?include_image_language=en,null`,
      { backdrops: [], posters: [] },
      'no-store'
    );

    const backdrops = Array.isArray(payload?.backdrops)
      ? payload.backdrops.map((image: any) => ({ ...image, type: 'backdrop' }))
      : [];
    const posters = Array.isArray(payload?.posters)
      ? payload.posters.map((image: any) => ({ ...image, type: 'poster' }))
      : [];

    return { data: { images: [...backdrops, ...posters] } };
  },

  getMoviesFormat: async (slug: string, page: number) => {
    if (LEGACY_API_BASE) {
      return fetchLegacy(`/v1/api/danh-sach/${slug}?page=${page}`, { data: { items: [] } }, 'no-store');
    }

    if (slug === 'phim-le') return MovieServices.getSingleMovies(page);
    if (slug === 'phim-bo') return MovieServices.getTVSeries(page);
    if (slug === 'hoat-hinh') return MovieServices.getCartoonMovies(page);
    if (slug === 'tv-shows') return MovieServices.getTVShows(page);

    const newly = await MovieServices.getNewlyMovies(page);
    return { data: { items: newly.items || [] } };
  },

  getMoviesType: async (slug: string, page: number) => {
    if (LEGACY_API_BASE) {
      return fetchLegacy(`/v1/api/the-loai/${slug}?page=${page}`, { data: { items: [] } }, 'no-store');
    }

    const config = TYPE_SLUG_TO_GENRE_IDS[slug];
    if (!config) {
      return { data: { items: [] } };
    }

    const [movieItems, tvItems] = await Promise.all([
      config.movie.length > 0
        ? fetchTmdbMovies(page, `&with_genres=${config.movie.join(',')}`)
        : Promise.resolve([]),
      config.tv.length > 0
        ? fetchTmdbTv(page, `&with_genres=${config.tv.join(',')}`)
        : Promise.resolve([]),
    ]);

    return { data: { items: uniqueMovies([...movieItems, ...tvItems]) } };
  },

  getMoviesCountry: async (slug: string, page: number) => {
    if (LEGACY_API_BASE) {
      return fetchLegacy(
        `/v1/api/quoc-gia/${slug}?page=${page}`,
        { data: { items: [] }, status: 'error' },
        'no-store'
      );
    }

    const codes = COUNTRY_SLUG_TO_CODES[slug] || [];
    if (codes.length === 0) {
      return { status: 'success', data: { items: [] } };
    }

    const moviePromises = codes.map((code) => fetchTmdbMovies(page, `&region=${code}`));
    const tvPromises = codes.map((code) => fetchTmdbTv(page, `&with_origin_country=${code}`));
    const [movieGroups, tvGroups] = await Promise.all([
      Promise.all(moviePromises),
      Promise.all(tvPromises),
    ]);

    const items = uniqueMovies([...movieGroups.flat(), ...tvGroups.flat()]);
    return { status: 'success', data: { items } };
  },

  searchMovie: async (keyword: string) => {
    if (LEGACY_API_BASE) {
      return fetchLegacy(`/v1/api/tim-kiem?keyword=${keyword}&limit=15`, { data: { items: [] } }, 'no-store');
    }

    const lookup = await getGenreLookup();
    const payload = await fetchTmdb(
      `/search/multi?query=${encodeURIComponent(keyword)}&include_adult=false&language=en-US&page=1`,
      { results: [] },
      'no-store'
    );

    const tmdbItems = (Array.isArray(payload?.results) ? payload.results : [])
      .filter((item: any) => item?.media_type === 'movie' || item?.media_type === 'tv')
      .map((item: any) => mapTmdbListItemToMovie(item, item.media_type, lookup));

    const kitsuSearch = await fetchKitsu(
      `/catalog/anime/kitsu-anime-list/search=${encodeURIComponent(keyword).replace(/%20/g, '+')}.json`,
      { metas: [] },
      'no-store'
    );

    const kitsuItems = (Array.isArray(kitsuSearch?.metas) ? kitsuSearch.metas : []).map(mapKitsuMetaToMovie);

    return { data: { items: uniqueMovies([...tmdbItems, ...kitsuItems]).slice(0, 30) } };
  },
};

export default MovieServices;
