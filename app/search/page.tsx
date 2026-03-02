import SearchMoviePage from '../../components/search';

import { Metadata } from 'next';

export const metadata: Metadata = {
  title:
    'Search movies',
  description:
    'Search movies',
};

export default function SearchMovie({searchParams}: {searchParams: {name?: string}}) {
  const movieName = searchParams.name || '';

  return <SearchMoviePage movieName={movieName}/>
}
