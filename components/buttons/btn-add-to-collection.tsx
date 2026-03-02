'use client';

import { FaPlus } from 'react-icons/fa';
import { TiTick } from 'react-icons/ti';
import { useSelector } from 'react-redux';
import { useAuthModel } from '../context/auth-modal-context';
import DetailMovie from 'types/detail-movie';
import { toast } from 'react-toastify';
import { useEffect, useState } from 'react';
import LoadingSpinerBtn from '../loading/loading-spiner-btn';
import MovieCollection from 'types/movie-collection';
import firebaseServices from 'services/firebase-services';

interface BtnAddToCollectionProps {
  variant: 'primary' | 'secondary';
  detailMovie: DetailMovie;
}

export default function BtnAddToCollection({ variant, detailMovie }: BtnAddToCollectionProps) {
  const user = useSelector((state: any) => state.auth.user);
  const { openAuthModal } = useAuthModel();
  const [isHandling, setIsHandling] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isExistedInCollection, setIsExistedInCollection] = useState(false);

  const movie: MovieCollection = {
    id: detailMovie.movie._id,
    slug: detailMovie.movie.slug,
    thumb_url: detailMovie.movie.thumb_url,
    name: detailMovie.movie.name,
    origin_name: detailMovie.movie.origin_name,
    lang: detailMovie.movie.lang,
    quality: detailMovie.movie.quality,
  };

  const toogleMovieToUserCollection = async () => {
    if (!user) {
      openAuthModal();
      return;
    }

    if (isExistedInCollection) {
      await removeMovieToUserCollection();
    } else {
      await addMovieToUserCollection();
    }
  };

  const addMovieToUserCollection = async () => {
    if (!user) return;
    setIsHandling(true);
    try {
      await firebaseServices.addMovieToCollection(user.id, movie);
      toast.success('Movie added to collection');
      setIsExistedInCollection(true);
    } catch (error: any) {
      console.log(error.message);
    } finally {
      setIsHandling(false);
    }
  };

  const removeMovieToUserCollection = async () => {
    if (!user) return;
    setIsHandling(true);
    try {
      await firebaseServices.removeMovieFromCollection(user.id, detailMovie.movie._id);
      toast.success('Movie removed from collection');
      setIsExistedInCollection(false);
    } catch (error: any) {
      console.log(error.message);
    } finally {
      setIsHandling(false);
    }
  };

  useEffect(() => {
    if (!user) {
      setIsExistedInCollection(false);
      setIsLoading(false);
      return;
    }

    const checkIfMovieExists = async () => {
      const movies = await firebaseServices.getMovieCollection(user.id);
      const movieExists = movies.some((m: any) => m.id === detailMovie.movie._id);
      setIsExistedInCollection(movieExists);
      setIsLoading(false);
    };

    checkIfMovieExists();
  }, [user, detailMovie.movie._id]);

  return (
    <button
      className={
        variant === 'primary'
          ? 'tv-action flex items-center space-x-2 rounded-xl border border-white/10 bg-[#717171] px-5 py-3 text-white transition duration-200 ease-in-out hover:bg-[#5a5a5a]'
          : 'tv-action flex items-center gap-x-2 rounded-xl border border-white/10 bg-white px-3 py-2 text-black font-semibold transition duration-200 ease-in-out hover:bg-gray-200'
      }
      onClick={toogleMovieToUserCollection}
      disabled={isHandling || isLoading}
    >
      {isLoading || isHandling ? (
        <LoadingSpinerBtn />
      ) : (
        <>
          {isExistedInCollection ? <TiTick size={18} /> : <FaPlus size={18} />}
          <span className="block leading-4 font-semibold">Collection</span>
        </>
      )}
    </button>
  );
}
