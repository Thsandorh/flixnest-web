import HeroSection from './hero-section';
import MovieList from '../commons/movie-list';
import MovieServices from 'services/movie-services';
import CatalogSections from './catalog-sections';

const curatedCatalogRows = [
  {
    slug: 'movie-action',
    title: 'TMDB Movie Catalog: Action Hits',
  },
  {
    slug: 'movie-sci-fi',
    title: 'TMDB Movie Catalog: Sci-Fi Picks',
  },
  {
    slug: 'series-crime',
    title: 'TMDB Series Catalog: Crime Stories',
  },
  {
    slug: 'series-sci-fi-fantasy',
    title: 'TMDB Series Catalog: Sci-Fi & Fantasy',
  },
  {
    slug: 'anime-tmdb-series',
    title: 'TMDB Anime Catalog: Animation Series',
  },
  {
    slug: 'anime-kitsu-popular',
    title: 'Kitsu Anime Catalog: Popular Now',
  },
] as const;

export default async function HomePage() {
  const newlyMoviesFetcher = MovieServices.getNewlyMovies();
  const singleMoviesFetcher = MovieServices.getSingleMovies();
  const tvSeriesFetcher = MovieServices.getTVSeries();
  const cartoonMoviesFetcher = MovieServices.getCartoonMovies();
  const tvShowsFetcher = MovieServices.getTVShows();

  const curatedCatalogFetchers = curatedCatalogRows.map((row) => MovieServices.getMoviesType(row.slug, 1));

  const [newlyMovies, singleMovies, tvSeries, cartoonMovies, tvShows, ...curatedCatalogResults] = await Promise.all([
    newlyMoviesFetcher,
    singleMoviesFetcher,
    tvSeriesFetcher,
    cartoonMoviesFetcher,
    tvShowsFetcher,
    ...curatedCatalogFetchers,
  ]);

  return (
    <div className="h-full">
      <HeroSection movies={newlyMovies.items.slice(0, 5)} />
      <div className="space-y-8">
        <MovieList listName="Recently Updated Movies" movies={newlyMovies.items} isNewlyMovieItem={true} />
        <MovieList
          movies={singleMovies.data.items.slice(0, 10)}
          listName="Recently Updated Single Movies"
          isNewlyMovieItem={false}
        />
        <MovieList movies={tvSeries.data.items.slice(0, 10)} listName="Recently Updated Series" isNewlyMovieItem={false} />
        <MovieList
          movies={cartoonMovies.data.items.slice(0, 10)}
          listName="Recently Updated Animation"
          isNewlyMovieItem={false}
        />
        <MovieList movies={tvShows.data.items.slice(0, 10)} listName="Recently Updated TV Shows" isNewlyMovieItem={false} />

        {curatedCatalogRows.map((row, index) => (
          <MovieList
            key={row.slug}
            movies={(curatedCatalogResults[index]?.data?.items || []).slice(0, 10)}
            listName={row.title}
            isNewlyMovieItem={false}
          />
        ))}

        <CatalogSections />
      </div>
    </div>
  );
}
