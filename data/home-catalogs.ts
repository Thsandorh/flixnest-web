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
      { name: 'Action', href: '/movies/type/movie-action', source: 'TMDB' },
      { name: 'Adventure', href: '/movies/type/movie-adventure', source: 'TMDB' },
      { name: 'Comedy', href: '/movies/type/movie-comedy', source: 'TMDB' },
      { name: 'Drama', href: '/movies/type/movie-drama', source: 'TMDB' },
      { name: 'Horror', href: '/movies/type/movie-horror', source: 'TMDB' },
      { name: 'Sci-Fi', href: '/movies/type/movie-sci-fi', source: 'TMDB' },
    ],
  },
  {
    title: 'Series Catalogs',
    description: 'TMDB TV catalogs with clearer grouping.',
    items: [
      { name: 'Action & Adventure', href: '/movies/type/series-action-adventure', source: 'TMDB' },
      { name: 'Crime', href: '/movies/type/series-crime', source: 'TMDB' },
      { name: 'Documentary', href: '/movies/type/series-documentary', source: 'TMDB' },
      { name: 'Drama', href: '/movies/type/series-drama', source: 'TMDB' },
      { name: 'Mystery', href: '/movies/type/series-mystery', source: 'TMDB' },
      { name: 'Sci-Fi & Fantasy', href: '/movies/type/series-sci-fi-fantasy', source: 'TMDB' },
    ],
  },
  {
    title: 'Anime Catalogs',
    description: 'TMDB animation + extra Kitsu catalogs.',
    items: [
      { name: 'Animation Movies', href: '/movies/type/anime-tmdb-movies', source: 'TMDB' },
      { name: 'Animation Series', href: '/movies/type/anime-tmdb-series', source: 'TMDB' },
      { name: 'Popular Anime', href: '/movies/type/anime-kitsu-popular', source: 'Kitsu' },
      { name: 'Trending Anime', href: '/movies/type/anime-kitsu-trending', source: 'Kitsu' },
      { name: 'Top Rated Anime', href: '/movies/type/anime-kitsu-top-rated', source: 'Kitsu' },
      { name: 'Upcoming Anime', href: '/movies/type/anime-kitsu-upcoming', source: 'Kitsu' },
    ],
  },
];
