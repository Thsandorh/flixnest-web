import MovieFormatPage from '../../../../components/movie-format';
import PageParams from 'types/page-params';
import movieFormat from 'data/move-format';

export async function generateMetadata({ params }: PageParams) {
  const format = movieFormat.find((item) => item.slug === params.slug);

  return {
    title: `${format ? format.name : 'Movies'} - Latest updates`,
    description: `Watch the latest ${format ? format.name.toLowerCase() : 'movies'} updated daily.`,
  };
}

export default function MovieFormat({ params }: { params: { slug: string } }) {
  return <MovieFormatPage slug={params.slug} />;
}
