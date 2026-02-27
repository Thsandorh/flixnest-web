import Link from 'next/link';
import Movie from 'types/movie';
import MovieCollection from 'types/movie-collection';
import Image from 'next/image';
import resolveImageUrl from 'utils/image-url';

export default function RegularMovieItem({ movie }: { movie: Movie | MovieCollection }) {
  return (
    <Link className="block relative h-auto space-y-2" href={`/movies/${movie.slug}`}>
      <div className="relative w-full aspect-[2/3]">
        <Image src={resolveImageUrl(movie.thumb_url)} fill={true} alt="" sizes="100%" />
      </div>
      <div>
        <div className="truncate">{movie.name}</div>
        <div className="truncate text-sm text-[#9B9285]">{movie.origin_name}</div>
      </div>
      <div className="absolute top-0 right-0 px-1 bg-custome-red">{movie.lang + '-' + movie.quality}</div>
    </Link>
  );
}