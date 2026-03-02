import Link from 'next/link';
import Movie from 'types/movie';
import MovieCollection from 'types/movie-collection';
import Image from 'next/image';
import resolveImageUrl from 'utils/image-url';

export default function RegularMovieItem({ movie }: { movie: Movie | MovieCollection }) {
  return (
    <Link className="tv-card block relative h-auto space-y-3 rounded-[1.2rem] border border-white/10 bg-white/[0.03] p-2" href={`/movies/${movie.slug}`}>
      <div className="relative w-full overflow-hidden rounded-[0.9rem] aspect-[2/3]">
        <Image src={resolveImageUrl(movie.thumb_url)} fill={true} alt="" className="object-cover" sizes="100%" />
      </div>
      <div className="px-1 pb-1">
        <div className="truncate font-medium">{movie.name}</div>
        <div className="truncate text-sm text-[#9B9285]">{movie.origin_name}</div>
      </div>
      <div className="absolute top-4 right-4 rounded-full border border-black/20 bg-custome-red px-2.5 py-1 text-xs font-semibold">{movie.lang + '-' + movie.quality}</div>
    </Link>
  );
}
