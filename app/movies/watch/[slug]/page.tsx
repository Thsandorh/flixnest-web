import MovieWatchPage from '../../../../components/watch';
import MovieServices from 'services/movie-services';
import DetailMovie from 'types/detail-movie';
import { Metadata } from 'next';
import PageParams from 'types/page-params';
import { redirect } from 'next/navigation';

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  try {
    const movie = await MovieServices.getDetailMovie(params.slug);
    if (!movie?.movie?.name) throw new Error('Invalid movie payload');

    return {
      title: `Watch ${movie.movie.name}`,
      description: movie.movie.content || '',
    };
  } catch {
    redirect('/');
  }
}

const parseSeasonParam = (value: string | string[] | undefined) => {
  const rawValue = Array.isArray(value) ? value[0] : value;
  const seasonNumber = Number(rawValue);
  return Number.isInteger(seasonNumber) && seasonNumber > 0 ? seasonNumber : undefined;
};

export default async function MovieWatch({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams?: { season?: string | string[] };
}) {
  let movie: DetailMovie;

  try {
    const res = await MovieServices.getDetailMovie(params.slug);
    if (!res?.movie) throw new Error('Invalid movie payload');
    movie = res;
  } catch {
    redirect(`/movies/${params.slug}`);
  }

  if (movie.movie.episode_current === 'Trailer') {
    redirect(`/movies/${params.slug}`);
  }

  return <MovieWatchPage movie={movie} initialSeasonNumber={parseSeasonParam(searchParams?.season)} />;
}
