import { Metadata } from 'next';
import MovieCollectionPage from '@/components/collection';

export const metadata: Metadata = {
  title:
    'Movie collection',
  description:
    'Movie collection',
};

export default function MoviesCollection() {
    return <MovieCollectionPage />
}
