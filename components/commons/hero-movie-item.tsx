import { FaPlay } from 'react-icons/fa';
import MovieSummary from '../movie/movie-summary';
import BtnAddToCollection from '../buttons/btn-add-to-collection';
import DetailMovie from 'types/detail-movie';
import Image from 'next/image';
import TMDBLogo from '../logos/TMDB-Logo';
import Category from 'types/category';
import { GoDotFill } from 'react-icons/go';
import Link from 'next/link';
import resolveImageUrl from 'utils/image-url';

export default function HeroMovieItem({ detailMovie }: { detailMovie: DetailMovie }) {
  const posterUrl = resolveImageUrl(detailMovie.movie.poster_url);

  const movieCategory = detailMovie.movie.category.map((item: Category, index) => (
    <span key={index}>
      {item.name}
      {index < detailMovie.movie.category.length - 1 ? '/' : ''}
    </span>
  ));

  return (
    <div className="container-wrapper relative w-full h-screen">
      {posterUrl && (
        <Image
          src={posterUrl}
          alt={`${detailMovie.movie.name} backdrop`}
          fill
          sizes="100vw"
          className="object-cover object-center"
        />
      )}
      <div className="absolute inset-0 bg-black opacity-45"></div>
      <div className="absolute inset-0 bg-gradient-to-r from-black to-50%"></div>
      <div className="absolute inset-0 bg-gradient-to-b from-black to-10%"></div>
      <div className="absolute inset-0 bg-gradient-to-t from-black to-10%"></div>
      <div className="absolute inset-0 bg-gradient-to-l from-black to-10%"></div>

      {/* Desktop Layout */}
      <div className="hidden lg:block absolute w-2/4 bottom-[5rem] left-6 space-y-5">
        <h2 className="text-5xl font-bold">{detailMovie.movie.name}</h2>
        <div className="flex items-center gap-x-2 text-sm">
          <div>{detailMovie.movie.year}</div>
          <GoDotFill size={12} />
          <div>{movieCategory}</div>
          <GoDotFill size={12} />
          <div>{detailMovie.movie.episode_current}</div>
        </div>
        <div className="flex items-center gap-x-2">
          <div className="w-[8rem]">
            <TMDBLogo />
          </div>
          <div className="">
            <span className="font-bold">{detailMovie.movie.tmdb.vote_average}</span>
            <span>/10</span>
          </div>
          <div>
            <span>({detailMovie.movie.tmdb.vote_count} votes)</span>
          </div>
        </div>
        <MovieSummary summary={detailMovie.movie.content || 'Movie content is being updated'} />
        <div className="space-x-5 flex items-center">
          <Link
            href={`/movies/${detailMovie.movie.slug}`}
            className="tv-action inline-block rounded-xl border border-white/10 bg-white px-5 py-3 text-black"
          >
            <div className="flex align-top space-x-2">
              <FaPlay size={18} />
              <span className="block leading-4 font-semibold">Watch</span>
            </div>
          </Link>
          <BtnAddToCollection variant="primary" detailMovie={detailMovie} />
        </div>
      </div>

      {/* Mobile/Tablet Layout */}
      <div className="lg:hidden absolute inset-0 flex flex-col justify-end">
        <div className="bg-gradient-to-t from-black via-black/80 to-transparent p-4 pb-8">
          {/* Movie Title */}
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-2 leading-tight">
            {detailMovie.movie.name}
          </h2>

          {/* Movie Metadata */}
          <div className="flex items-center gap-x-3 mb-4 text-sm text-white/90">
            <div>{detailMovie.movie.year}</div>
            <div className="text-white/60">•</div>
            <div>{detailMovie.movie.episode_current}</div>
            <div className="text-white/60">•</div>
            <div className="text-white text-sm">
              <span className="font-bold">{detailMovie.movie.tmdb.vote_average}</span>
              <span>/10</span>
            </div>
          </div>

          {/* TMDB Rating */}
          {/* <div className="flex items-center gap-x-2 mb-4">
            <div className="w-16 h-4 flex items-center">
              <TMDBLogo />
            </div>
            <div className="text-white text-sm">
              <span className="font-bold">{detailMovie.movie.tmdb.vote_average}</span>
              <span>/10</span>
            </div>
          </div> */}

          {/* Action Buttons */}
          <div className="space-y-3">
            <Link
              href={`/movies/${detailMovie.movie.slug}`}
              className="tv-action block w-full rounded-xl border border-white/10 bg-white px-4 py-3 text-center font-semibold text-black"
            >
              <div className="flex items-center justify-center gap-x-2">
                <FaPlay size={16} />
                <span>Watch</span>
              </div>
            </Link>
            <div className="w-full">
              <BtnAddToCollection variant="primary" detailMovie={detailMovie} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
