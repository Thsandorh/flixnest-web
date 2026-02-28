'use client';
import DetailMovie from 'types/detail-movie';
import VideoPlayer from './video-player';
import { useEffect, useRef, useState } from 'react';
import { isHaveEpisodesMovie } from 'utils/movie-utils';
import ServerSection from './server-section';
import ProgresswatchNotification from './progress-watch-notification';
import { useDispatch, useSelector } from 'react-redux';
import { setProgress } from '../../redux/slices/progress-slice';
import CommentSection from '../comment';
import { IRecentMovie } from 'types/recent-movie';
import firebaseServices from 'services/firebase-services';

export default function MovieWatchPage({ movie }: { movie: DetailMovie }) {
  // episodes[serverIndex]: selected server
  // server_data[episodeIndex] || server_data[index]: episode

  const user = useSelector((state: any) => state.auth.user);
  const progress = useSelector((state: any) => state.progress.progress);
  const dispatch = useDispatch();

  const [serverIndex, setServerIndex] = useState<number>(0);
  const [episodeIndex, setEpisodeIndex] = useState<number>(0);
  const [episodeLink, setEpisodeLink] = useState<string>('');
  const [videoProgress, setVideoProgress] = useState<number | null>(null);
  const [previousWatchProgress, setPreviousWatchProgress] = useState({
    progressTime: 0,
    progressEpIndex: 0,
    progressEpLink: '',
  });
  const [isShowToastProgress, setIsShowToastProgress] = useState(false);
  const [isFirstPlay, setIsFirstPlay] = useState<boolean>(true);

  const videoRef = useRef<HTMLVideoElement | null>(null);

  const resolveEpisodeLink = (targetServerIndex: number, targetEpisodeIndex: number) => {
    return movie.episodes?.[targetServerIndex]?.server_data?.[targetEpisodeIndex]?.link_m3u8 || '';
  };

  const resolveDefaultEpisodeLink = () => {
    return resolveEpisodeLink(0, 0);
  };

  const handleSwitchEpisode = (index: number) => {
    setEpisodeIndex(index);
    setVideoProgress(null);
    setEpisodeLink(resolveEpisodeLink(serverIndex, index) || resolveDefaultEpisodeLink());
  };

  const handleSetServerIndex = (index: number) => {
    if (index === serverIndex) return;

    setServerIndex(index);
    setEpisodeIndex(0);
    setVideoProgress(null);
    setEpisodeLink(resolveEpisodeLink(index, 0) || resolveDefaultEpisodeLink());
  };

  useEffect(() => {
    setEpisodeIndex(0);
    setEpisodeLink(resolveDefaultEpisodeLink());

    if (user) {
      restoreUserWatchProgress(user.id, movie.movie._id);
    }

    restoreGuestWatchProgress(progress);
  }, []);

  const restoreUserWatchProgress = async (userId: string, movieId: string) => {
    const res: any = await firebaseServices.getProgressWatchOfMovie(userId, movieId);
    if (!res.status) return;

    setPreviousWatchProgress({
      progressEpIndex: res.progressEpIndex,
      progressTime: res.progressTime,
      progressEpLink: res.progressEpLink,
    });

    setTimeout(() => setIsShowToastProgress(true), 2000);
  };

  const restoreGuestWatchProgress = (guestProgress: any) => {
    if (guestProgress?.id !== movie.movie._id) return;

    setPreviousWatchProgress({
      progressEpIndex: guestProgress.progress.episodeIndex,
      progressTime: guestProgress.progress.progressTime,
      progressEpLink: guestProgress.progress.episodeLink,
    });

    setTimeout(() => setIsShowToastProgress(true), 2000);
  };

  const handleTrackingProgressWatch = async () => {
    if (videoRef.current?.currentTime === 0) return;

    if (!user) {
      const guestProgress = {
        id: movie.movie._id,
        slug: movie.movie.slug,
        thumb_url: movie.movie.thumb_url,
        name: movie.movie.name,
        origin_name: movie.movie.origin_name,
        lang: movie.movie.lang,
        quality: movie.movie.quality,
        progress: {
          progressTime: videoRef.current?.currentTime,
          episodeIndex,
          episodeLink,
        },
      };
      dispatch(setProgress(guestProgress));
      return;
    }

    const recentMovieData: IRecentMovie = {
      userId: user.id,
      id: movie.movie._id,
      slug: movie.movie.slug,
      thumb_url: movie.movie.thumb_url,
      name: movie.movie.name,
      origin_name: movie.movie.origin_name,
      lang: movie.movie.lang,
      quality: movie.movie.quality,
      progressEpIndex: episodeIndex || 0,
      progressTime: videoRef.current?.currentTime || 0,
      progressEpLink: episodeLink || resolveDefaultEpisodeLink(),
    };

    const blob = new Blob([JSON.stringify(recentMovieData)], { type: 'application/json' });
    navigator.sendBeacon('/api/movies/store-recent-movie', blob);
  };

  useEffect(() => {
    window.addEventListener('beforeunload', handleTrackingProgressWatch);
    return () => window.removeEventListener('beforeunload', handleTrackingProgressWatch);
  }, [episodeLink, user]);

  useEffect(() => {
    if (!videoRef.current || !isFirstPlay || !user) return;
    const videoElement = videoRef.current;

    const handleStoreRecentMovie = async () => {
      const recentMovieData: IRecentMovie = {
        id: movie.movie._id,
        slug: movie.movie.slug,
        thumb_url: movie.movie.thumb_url,
        name: movie.movie.name,
        origin_name: movie.movie.origin_name,
        lang: movie.movie.lang,
        quality: movie.movie.quality,
        progressEpIndex: progress.progress.episodeIndex || 0,
        progressTime: progress.progress.progressTime || 0,
        progressEpLink: progress.progress.episodeLink || resolveDefaultEpisodeLink(),
      };

      await firebaseServices.storeRecentMovies(recentMovieData, user.id);
      setIsFirstPlay(false);
    };

    videoElement.addEventListener('playing', handleStoreRecentMovie);
    return () => videoElement.removeEventListener('playing', handleStoreRecentMovie);
  }, [isFirstPlay, user]);

  const handleAcceptProgressWatch = () => {
    setEpisodeIndex(previousWatchProgress.progressEpIndex);
    setEpisodeLink(previousWatchProgress.progressEpLink);
    setVideoProgress(previousWatchProgress.progressTime);
    setIsShowToastProgress(false);
  };

  const handleRejectProgressWatch = () => {
    setIsShowToastProgress(false);
  };

  const hasMultipleServers = movie.episodes.length > 1;

  return (
    <div className="pt-20 lg:pt-[3.75rem] space-y-6 lg:space-y-10">
      <ProgresswatchNotification
        isShowMessage={isShowToastProgress}
        previousWatchProgress={previousWatchProgress}
        handleAcceptProgressWatch={handleAcceptProgressWatch}
        handleRejectProgressWatch={handleRejectProgressWatch}
        movie={movie}
      />
      <VideoPlayer ref={videoRef} videoUrl={episodeLink} thumbnail={movie.movie.poster_url} videoProgress={videoProgress} />
      {hasMultipleServers && (
        <div className="text-center text-sm lg:text-base px-4">
          If playback is lagging, please choose one of the servers below
        </div>
      )}
      <ServerSection
        movie={movie}
        serverIndex={serverIndex}
        handleSetServerIndex={handleSetServerIndex}
      />
      <div className="container-wrapper-movie px-4 lg:px-0">
        <h1 className="text-xl lg:text-3xl">{movie.movie.name}</h1>
        <h3 className="text-base lg:text-lg text-[#bbb6ae] mt-2">{movie.movie.origin_name}</h3>
      </div>
      {isHaveEpisodesMovie(movie) && (
        <div className="container-wrapper-movie px-4 lg:px-0">
          <h1 className="text-lg lg:text-xl">Episode list</h1>
          <ul className="flex flex-wrap gap-2 lg:gap-3 mt-4">
            {movie.episodes[0].server_data.map((ep, index) => (
              <li
                key={index}
                className={`block ${
                  episodeIndex === index
                    ? 'text-white bg-[#5E5E5E]'
                    : 'bg-white text-black hover:bg-[#d3d3d3]'
                } px-2 lg:px-3 py-1.5 lg:py-2 rounded-md font-semibold cursor-pointer text-sm lg:text-base`}
                onClick={() => handleSwitchEpisode(index)}
              >
                {`Episode ${index + 1}`}
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="container-wrapper-movie px-4 lg:px-0">
        <CommentSection movie={movie} />
      </div>
    </div>
  );
}
