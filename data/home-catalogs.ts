export interface HomeCatalogItem {
  name: string;
  href: string;
  source: 'TMDB' | 'Kitsu';
}

export interface HomeCatalogSection {
  title: string;
  description: string;
  items: HomeCatalogItem[];
}

export const homeCatalogSections: HomeCatalogSection[] = [
  {
    title: 'Movie Catalogs',
    description: 'TMDB movie catalogs by genre.',
    items: [
      { name: 'Action Movies', href: '/movies/type/movie-action', source: 'TMDB' },
      { name: 'Adventure Movies', href: '/movies/type/movie-adventure', source: 'TMDB' },
      { name: 'Comedy Movies', href: '/movies/type/movie-comedy', source: 'TMDB' },
      { name: 'Drama Movies', href: '/movies/type/movie-drama', source: 'TMDB' },
      { name: 'Horror Movies', href: '/movies/type/movie-horror', source: 'TMDB' },
      { name: 'Sci-Fi Movies', href: '/movies/type/movie-sci-fi', source: 'TMDB' },
    ],
  },
  {
    title: 'Series Catalogs',
    description: 'TMDB TV catalogs with clearer grouping.',
    items: [
      { name: 'Action & Adventure Series', href: '/movies/type/series-action-adventure', source: 'TMDB' },
      { name: 'Crime Series', href: '/movies/type/series-crime', source: 'TMDB' },
      { name: 'Documentary Series', href: '/movies/type/series-documentary', source: 'TMDB' },
      { name: 'Drama Series', href: '/movies/type/series-drama', source: 'TMDB' },
      { name: 'Mystery Series', href: '/movies/type/series-mystery', source: 'TMDB' },
      { name: 'Sci-Fi & Fantasy Series', href: '/movies/type/series-sci-fi-fantasy', source: 'TMDB' },
    ],
  },
  {
    title: 'Anime Catalogs',
    description: 'TMDB animation + extra Kitsu catalogs.',
    items: [
      { name: 'TMDB Animation Movies', href: '/movies/type/anime-tmdb-movies', source: 'TMDB' },
      { name: 'TMDB Animation Series', href: '/movies/type/anime-tmdb-series', source: 'TMDB' },
      { name: 'Kitsu Popular Anime', href: '/movies/type/anime-kitsu-popular', source: 'Kitsu' },
      { name: 'Kitsu Trending Anime', href: '/movies/type/anime-kitsu-trending', source: 'Kitsu' },
      { name: 'Kitsu Top Rated Anime', href: '/movies/type/anime-kitsu-top-rated', source: 'Kitsu' },
      { name: 'Kitsu Upcoming Anime', href: '/movies/type/anime-kitsu-upcoming', source: 'Kitsu' },
    ],
  },
];
