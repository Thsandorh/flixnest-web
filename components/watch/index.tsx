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
  const hasEpisodeSource = String(episodeLink || '').trim().length > 0;
  const stremioType = movie.movie.tmdb?.type === 'tv' ? 'series' : 'movie';
  const stremioTmdbId = String(movie.movie.tmdb?.id || '').trim();
  const stremioSeason = Number(movie.movie.tmdb?.season || 1);

  const resolveEpisodeLink = (targetServerIndex: number, targetEpisodeIndex: number) => {
    return movie.episodes?.[targetServerIndex]?.server_data?.[targetEpisodeIndex]?.link_m3u8 || '';
  };

  const resolveDefaultEpisodeLink = () => {
    return resolveEpisodeLink(0, 0);
  };

  const requiresBlockedProxyHeaders = (raw: any) => {
    const proxyHeaders = raw?.behaviorHints?.proxyHeaders?.request;
    return Boolean(
      proxyHeaders &&
        (proxyHeaders.Referer ||
          proxyHeaders.referer ||
          proxyHeaders.Origin ||
          proxyHeaders.origin ||
          proxyHeaders['User-Agent'] ||
          proxyHeaders['user-agent'])
    );
  };

  const fetchAddonCandidates = async (targetEpisodeIndex: number): Promise<StreamCandidate[]> => {
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
      const rawPlayable = Array.isArray(data?.playable) ? data.playable : [];
      const mapped = rawPlayable
        .map((item: any) => {
          const url = String(item?.url || '').trim();
          if (!url) return null;

          return {
            url: toPlaybackUrl(url),
            name: String(item?.name || ''),
            title: String(item?.raw?.title || ''),
            isBlocked: requiresBlockedProxyHeaders(item?.raw),
          };
        })
        .filter(
          (item: StreamCandidate & { isBlocked: boolean } | null): item is StreamCandidate & {
            isBlocked: boolean;
          } => item !== null
        );

      const webReady = mapped.filter((item) => !item.isBlocked);
      const ordered = webReady.length > 0 ? webReady : mapped;

      const seen = new Set<string>();
      return ordered
        .filter((item) => {
          if (seen.has(item.url)) return false;
          seen.add(item.url);
          return true;
        })
        .map((item) => ({ url: item.url, name: item.name, title: item.title }));
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

    const addonCandidates = await fetchAddonCandidates(targetEpisodeIndex);
    if (token !== streamRequestTokenRef.current) return;

    if (addonCandidates.length > 0) {
      setStreamCandidates(addonCandidates);
      setActiveStreamIndex(0);
      setEpisodeLink(addonCandidates[0].url);
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
    const fallbackProgressLink = resolveEpisodeLink(serverIndex, previousWatchProgress.progressEpIndex);
    setEpisodeIndex(previousWatchProgress.progressEpIndex);
    setEpisodeLink(previousWatchProgress.progressEpLink || fallbackProgressLink || resolveDefaultEpisodeLink());
    setVideoProgress(previousWatchProgress.progressTime);
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
      {hasEpisodeSource ? (
        <VideoPlayer
          ref={videoRef}
          videoUrl={episodeLink}
          thumbnail={movie.movie.poster_url}
          videoProgress={videoProgress}
          onPlaybackError={handlePlaybackError}
        />
      ) : (
        <div className="container-wrapper-movie px-4 lg:px-0">
          <div className="w-full rounded-md border border-zinc-700 bg-zinc-900/70 p-6 text-center text-sm lg:text-base text-zinc-200">
            No playable stream was resolved for this title.
          </div>
        </div>
      )}
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
