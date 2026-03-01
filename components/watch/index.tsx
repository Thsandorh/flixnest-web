'use client';
import DetailMovie from 'types/detail-movie';
import VideoPlayer from './video-player';
import { useEffect, useState } from 'react';
import { isHaveEpisodesMovie } from 'utils/movie-utils';
import ServerSection from './server-section';
import { useRef } from 'react';
import ProgresswatchNotification from './progress-watch-notification';
import { useDispatch, useSelector } from 'react-redux';
import { setProgress } from '../../redux/slices/progress-slice';
import CommentSection from '../comment';
import { IRecentMovie } from 'types/recent-movie';
import firebaseServices from 'services/firebase-services';

type StreamCandidate = {
  url: string;
  name: string;
  title: string;
};

const isPlaylistLikeUrl = (candidateUrl: string) => {
  const normalized = String(candidateUrl || '').trim().toLowerCase();
  if (!normalized) return false;

  try {
    const parsed = new URL(normalized);
    return parsed.pathname.includes('.m3u8') || parsed.pathname.includes('/playlist/');
  } catch {
    return normalized.includes('.m3u8') || normalized.includes('/playlist/');
  }
};

const toPlaybackUrl = (candidateUrl: string) => {
  if (!isPlaylistLikeUrl(candidateUrl)) return candidateUrl;
  return `/api/media/playlist?url=${encodeURIComponent(candidateUrl)}`;
};

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
  const [streamCandidates, setStreamCandidates] = useState<StreamCandidate[]>([]);
  const [activeStreamIndex, setActiveStreamIndex] = useState(0);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRequestTokenRef = useRef(0);

  const stremioType = movie.movie.tmdb?.type === 'tv' ? 'series' : 'movie';
  const stremioTmdbId = String(movie.movie.tmdb?.id || '').trim();
  const stremioSeason = Number(movie.movie.tmdb?.season || 1);

  const resolveEpisodeLink = (targetServerIndex: number, targetEpisodeIndex: number) => {
    return movie.episodes?.[targetServerIndex]?.server_data?.[targetEpisodeIndex]?.link_m3u8 || '';
  };

  const fetchStremioCandidates = async (targetEpisodeIndex: number): Promise<StreamCandidate[]> => {
    if (!stremioTmdbId) return [];

    try {
      const endpoint = new URL('/api/streams/stremio', window.location.origin);
      endpoint.searchParams.set('type', stremioType);
      endpoint.searchParams.set('id', stremioTmdbId);
      endpoint.searchParams.set('tmdbId', stremioTmdbId);

      if (stremioType === 'series') {
        endpoint.searchParams.set('season', String(stremioSeason));
        endpoint.searchParams.set('episode', String(targetEpisodeIndex + 1));
      }

      const res = await fetch(endpoint.toString(), {
        method: 'GET',
        cache: 'no-store',
      });

      if (!res.ok) return [];

      const data = await res.json();
      const firstWorkingUrl = String(data?.firstWorkingUrl || '').trim();
      const playable = Array.isArray(data?.playable) ? data.playable : [];

      const mapped = playable
        .map((item: any) => {
          const rawUrl = String(item?.url || item?.raw?.url || item?.raw?.externalUrl || '').trim();
          if (!rawUrl) return null;

          return {
            url: toPlaybackUrl(rawUrl),
            name: String(item?.name || item?.raw?.name || ''),
            title: String(item?.raw?.title || ''),
          };
        })
        .filter((item: StreamCandidate | null): item is StreamCandidate => item !== null);

      const ordered = firstWorkingUrl
        ? [
            ...mapped.filter((candidate) => candidate.url === toPlaybackUrl(firstWorkingUrl)),
            ...mapped.filter((candidate) => candidate.url !== toPlaybackUrl(firstWorkingUrl)),
          ]
        : mapped;

      const seen = new Set<string>();
      return ordered.filter((candidate) => {
        if (seen.has(candidate.url)) return false;
        seen.add(candidate.url);
        return true;
      });
    } catch {
      return [];
    }
  };

  const loadEpisodeSource = async (targetServerIndex: number, targetEpisodeIndex: number) => {
    const token = ++streamRequestTokenRef.current;
    const nativeLink = resolveEpisodeLink(targetServerIndex, targetEpisodeIndex);

    if (nativeLink) {
      if (token !== streamRequestTokenRef.current) return;
      setStreamCandidates([]);
      setActiveStreamIndex(0);
      setEpisodeLink(nativeLink);
      return;
    }

    const candidates = await fetchStremioCandidates(targetEpisodeIndex);
    if (token !== streamRequestTokenRef.current) return;

    if (candidates.length > 0) {
      setStreamCandidates(candidates);
      setActiveStreamIndex(0);
      setEpisodeLink(candidates[0].url);
      return;
    }

    setStreamCandidates([]);
    setActiveStreamIndex(0);
    setEpisodeLink('');
  };

  const handleSwitchEpisode = (index: number) => {
    setEpisodeIndex(index);
    setVideoProgress(null);
    void loadEpisodeSource(serverIndex, index);
  };

  const handleSetServerIndex = (index: number) => {
    if (index === serverIndex) return;

    setServerIndex(index);
    setEpisodeIndex(0);
    setVideoProgress(null);
    void loadEpisodeSource(index, 0);
  };

  useEffect(() => {
    setEpisodeIndex(0);
    void loadEpisodeSource(0, 0);

    // restore progress watching of user authenticated
    if (user) {
      restoreUserWatchProgress(user.id, movie.movie._id);
    }

    restoreGuestWatchProgress(progress);
  }, []);

  const restoreUserWatchProgress = async (userId: string, movieId: string) => {
    const res: any = await firebaseServices.getProgressWatchOfMovie(userId, movieId);

    if (!res.status) {
      return;
    }

    setPreviousWatchProgress({
      progressEpIndex: res.progressEpIndex,
      progressTime: res.progressTime,
      progressEpLink: res.progressEpLink,
    });

    setTimeout(() => {
      setIsShowToastProgress(true);
    }, 2000);
  };

  const restoreGuestWatchProgress = (progress: any) => {
    if (progress?.id !== movie.movie._id) return;

    setPreviousWatchProgress({
      progressEpIndex: progress.progress.episodeIndex,
      progressTime: progress.progress.progressTime,
      progressEpLink: progress.progress.episodeLink,
    });

    setTimeout(() => {
      setIsShowToastProgress(true);
    }, 2000);
  };

  const handleTrackingProgressWatch = async () => {
    if (videoRef.current?.currentTime === 0) return;

    // store data for user not authenticated
    if (!user) {
      const progress = {
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

      dispatch(setProgress(progress));
      return;
    }

    // store data for user authenticated
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
      progressEpLink: episodeLink || movie.episodes[0].server_data[0].link_m3u8,
    };

    // Convert the data into a JSON string
    const jsonData = JSON.stringify(recentMovieData);

    // Create a Blob with the correct MIME type
    const blob = new Blob([jsonData], { type: 'application/json' });

    // this route will handle store recent movie and progress of movie
    navigator.sendBeacon('/api/movies/store-recent-movie', blob);
  };

  useEffect(() => {
    window.addEventListener('beforeunload', handleTrackingProgressWatch);

    return () => {
      window.removeEventListener('beforeunload', handleTrackingProgressWatch);
    };
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
        progressEpLink: progress.progress.episodeLink || movie.episodes[0].server_data[0].link_m3u8,
      };

      await firebaseServices.storeRecentMovies(recentMovieData, user.id);
      setIsFirstPlay(false);
    };

    videoElement.addEventListener('playing', handleStoreRecentMovie);

    return () => {
      videoElement.removeEventListener('playing', handleStoreRecentMovie);
    };
  }, [isFirstPlay, user]);

  const handleAcceptProgressWatch = () => {
    setEpisodeIndex(previousWatchProgress.progressEpIndex);
    setVideoProgress(previousWatchProgress.progressTime);

    if (previousWatchProgress.progressEpLink) {
      setEpisodeLink(previousWatchProgress.progressEpLink);
    } else {
      void loadEpisodeSource(serverIndex, previousWatchProgress.progressEpIndex);
    }

    setIsShowToastProgress(false);
  };

  const handleRejectProgressWatch = () => {
    setIsShowToastProgress(false);
  };

  const handlePlaybackError = () => {
    const nextIndex = activeStreamIndex + 1;
    const nextCandidate = streamCandidates[nextIndex];
    if (!nextCandidate) return;

    setActiveStreamIndex(nextIndex);
    setEpisodeLink(nextCandidate.url);
  };

  return (
    <div className="pt-20 lg:pt-[3.75rem] space-y-6 lg:space-y-10">
      <ProgresswatchNotification
        isShowMessage={isShowToastProgress}
        previousWatchProgress={previousWatchProgress}
        handleAcceptProgressWatch={handleAcceptProgressWatch}
        handleRejectProgressWatch={handleRejectProgressWatch}
        movie={movie}
      />
      <VideoPlayer
        ref={videoRef}
        videoUrl={episodeLink}
        thumbnail={movie.movie.poster_url}
        videoProgress={videoProgress}
        onPlaybackError={handlePlaybackError}
      />
      {movie.episodes.length > 1 && (
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
