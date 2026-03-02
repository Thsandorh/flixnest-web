'use client';

import { Swiper, SwiperSlide } from 'swiper/react';
import { EffectFade, Autoplay } from 'swiper/modules';
import NewlyMovie from 'types/newly-movie';
import HeroMovieItem from '../commons/hero-movie-item';
import { useEffect, useRef, useState } from 'react';
import { getDetailMovieServerAction } from 'app/actions';
import DetailMovie from 'types/detail-movie';
import LoadingComponent from '../loading/loading-component';
import { useHomePageLoadingContext } from '../context/home-page-loading-context';
import { FaChevronRight } from 'react-icons/fa6';

export default function HeroSection({ movies }: { movies: NewlyMovie[] }) {
  const [detailMovies, setDetailMovies] = useState<DetailMovie[]>([]);
  const swiperRef = useRef<any>(null);

  const { isLoadingHomePage, setISLoadingHomePage } = useHomePageLoadingContext();

  useEffect(() => {
    const getDescriptionMovies = async () => {
      const data = await getDetailMovieServerAction(movies);
      setDetailMovies(data);
      setISLoadingHomePage(false);
    };

    getDescriptionMovies();
  }, [movies, setISLoadingHomePage]);

  const handleClickToNextSlide = () => {
    swiperRef.current?.slideNext();
  };

  if (isLoadingHomePage) {
    return <LoadingComponent />;
  }

  return (
    <div className="relative">
      <Swiper
        modules={[EffectFade, Autoplay]}
        effect="fade"
        autoplay={{ delay: 10000 }}
        loop={true}
        onSwiper={(swiper) => (swiperRef.current = swiper)}
      >
        {detailMovies.map((movie: DetailMovie) => {
          return (
            <SwiperSlide key={movie.movie._id}>
              <HeroMovieItem detailMovie={movie} />
            </SwiperSlide>
          );
        })}
      </Swiper>
      {/* Desktop Navigation Button */}
      <button
        type="button"
        className="tv-icon-button hidden lg:inline-flex absolute z-10 top-[18rem] right-6 h-16 w-16 items-center justify-center rounded-full border border-white/20 bg-black/55 text-white transition-all duration-300"
        onClick={handleClickToNextSlide}
        aria-label="Show next featured title"
      >
        <FaChevronRight className="text-white transition-colors duration-300" />
      </button>

      {/* Mobile/Tablet Navigation Button */}
      <button
        type="button"
        className="tv-icon-button lg:hidden absolute z-10 top-1/2 right-4 transform -translate-y-1/2 inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-black/55 text-white transition-all duration-300"
        onClick={handleClickToNextSlide}
        aria-label="Show next featured title"
      >
        <FaChevronRight
          className="text-white"
          size={16}
        />
      </button>
    </div>
  );
}
