import HomePage from '../components/home';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title:
    'FlixNest - Watch Movies Online | Films | TV Shows | Series | Animation',
  description:
    'Watch movies online with thousands of films, TV shows, and series across many genres. Enjoy high-quality streaming for free on FlixNest.',
};

export default function Home() {
  return <HomePage />
}
