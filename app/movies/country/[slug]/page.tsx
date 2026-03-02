import MovieCountryPage from '../../../../components/movie-country';
import PageParams from 'types/page-params';
import countries from 'data/countries';

export async function generateMetadata({ params }: PageParams) {
  const country = countries.find((item) => item.slug === params.slug);

  return {
    title: `${country ? country.name : 'Movies'} - Latest updates`,
    description: `Discover the latest movies from ${country ? country.name : 'around the world'}.`,
  };
}

export default function MovieCountry({ params }: { params: { slug: string } }) {
  return <MovieCountryPage slug={params.slug} />;
}
