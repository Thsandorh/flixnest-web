export type MovieTypeSource = 'tmdb' | 'kitsu';

export interface MovieTypeItem {
  name: string;
  slug: string;
  source: MovieTypeSource;
  catalog: 'movie' | 'series' | 'anime';
}

export interface MovieTypeSection {
  title: string;
  items: MovieTypeItem[];
}

export const movieTypeSections: MovieTypeSection[] = [
  {
    title: 'Movie catalog',
    items: [
      { name: 'Action', slug: 'movie-action', source: 'tmdb', catalog: 'movie' },
      { name: 'Adventure', slug: 'movie-adventure', source: 'tmdb', catalog: 'movie' },
      { name: 'Comedy', slug: 'movie-comedy', source: 'tmdb', catalog: 'movie' },
      { name: 'Drama', slug: 'movie-drama', source: 'tmdb', catalog: 'movie' },
      { name: 'Horror', slug: 'movie-horror', source: 'tmdb', catalog: 'movie' },
      { name: 'Sci-Fi', slug: 'movie-sci-fi', source: 'tmdb', catalog: 'movie' },
      { name: 'Thriller', slug: 'movie-thriller', source: 'tmdb', catalog: 'movie' },
    ],
  },
  {
    title: 'Series catalog',
    items: [
      { name: 'Action & Adventure', slug: 'series-action-adventure', source: 'tmdb', catalog: 'series' },
      { name: 'Comedy', slug: 'series-comedy', source: 'tmdb', catalog: 'series' },
      { name: 'Crime', slug: 'series-crime', source: 'tmdb', catalog: 'series' },
      { name: 'Documentary', slug: 'series-documentary', source: 'tmdb', catalog: 'series' },
      { name: 'Drama', slug: 'series-drama', source: 'tmdb', catalog: 'series' },
      { name: 'Mystery', slug: 'series-mystery', source: 'tmdb', catalog: 'series' },
      { name: 'Sci-Fi & Fantasy', slug: 'series-sci-fi-fantasy', source: 'tmdb', catalog: 'series' },
    ],
  },
  {
    title: 'Anime catalog',
    items: [
      { name: 'Animation Movies', slug: 'anime-tmdb-movies', source: 'tmdb', catalog: 'anime' },
      { name: 'Animation Series', slug: 'anime-tmdb-series', source: 'tmdb', catalog: 'anime' },
      { name: 'Kitsu Popular', slug: 'anime-kitsu-popular', source: 'kitsu', catalog: 'anime' },
      { name: 'Kitsu Trending', slug: 'anime-kitsu-trending', source: 'kitsu', catalog: 'anime' },
      { name: 'Kitsu Top Rated', slug: 'anime-kitsu-top-rated', source: 'kitsu', catalog: 'anime' },
      { name: 'Kitsu Upcoming', slug: 'anime-kitsu-upcoming', source: 'kitsu', catalog: 'anime' },
    ],
  },
];

const movieType: MovieTypeItem[] = movieTypeSections.flatMap((section) => section.items);

export default movieType;
