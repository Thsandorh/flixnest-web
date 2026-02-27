import MovieTypePage from '@/components/move-type';
import PageParams from 'types/page-params';
import movieType from 'data/movie-type';

export async function generateMetadata({ params }: PageParams) {
  const type = movieType.find((item) => item.slug === params.slug);

  return {
    title: `${type ? type.name : 'Movies'} - Latest updates`,
    description: `Browse top ${type ? type.name.toLowerCase() : 'movie'} titles and latest picks.`,
  };
}

export default function MovieType({ params }: { params: { slug: string } }) {
  return <MovieTypePage slug={params.slug} />;
}
