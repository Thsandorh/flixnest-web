import HeroSection from './hero-section';
import MovieList from '../commons/movie-list';
import MovieServices from 'services/movie-services';

export default async function HomePage() {
  const newlyMoviesFetcher = MovieServices.getNewlyMovies();
  const singleMoviesFetcher = MovieServices.getSingleMovies();
  const tvSeriesFetcher = MovieServices.getTVSeries();
  const cartoonMoviesFetcher = MovieServices.getCartoonMovies();
  const tvShowsFetcher = MovieServices.getTVShows();

  // will improve later with Promise.settled()
  const [newlyMovies, singleMovies, tvSeries, cartoonMovies, tvShows] = await Promise.all([newlyMoviesFetcher, singleMoviesFetcher, tvSeriesFetcher, cartoonMoviesFetcher, tvShowsFetcher]);

  return (
    <div className='h-full'>
      <HeroSection movies={newlyMovies.items.slice(0, 5)} />
      <div className="space-y-8">
        <MovieList
          listName="Recently Updated Movies"
          movies={newlyMovies.items}
          isNewlyMovieItem={true}
        />
        <MovieList movies={singleMovies.data.items.slice(0,10)} listName="Recently Updated Single Movies" isNewlyMovieItem={false} />
        <MovieList movies={tvSeries.data.items.slice(0,10)} listName="Recently Updated Series" isNewlyMovieItem={false}/>
        <MovieList movies={cartoonMovies.data.items.slice(0,10)} listName="Recently Updated Animation" isNewlyMovieItem={false}/>
        <MovieList movies={tvShows.data.items.slice(0,10)} listName="Recently Updated TV Shows" isNewlyMovieItem={false}/>
      </div>
    </div>
  );
}
