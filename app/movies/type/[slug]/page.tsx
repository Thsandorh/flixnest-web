import MovieTypePage from '../../../../components/move-type';
import PageParams from 'types/page-params';
import movieType from 'data/movie-type';

const prettifySlug = (slug: string) =>
  slug
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

export async function generateMetadata({ params }: PageParams) {
  const type = movieType.find((item) => item.slug === params.slug);

  const typeName = type ? type.name : prettifySlug(params.slug || 'movies');

  return {
    title: `${typeName} - Latest updates`,
    description: `Browse top ${typeName.toLowerCase()} titles and latest picks.`,
  };
}

export default function MovieType({ params }: { params: { slug: string } }) {
  return <MovieTypePage slug={params.slug} />;
}
