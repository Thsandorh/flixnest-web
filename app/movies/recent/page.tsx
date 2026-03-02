import RecentMoviePage from '../../../components/recent';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title:
      'Recently watched movies',
    description:
      'Recently watched movies',
  };

export default function RecentMovies() {
    return <RecentMoviePage />
}
