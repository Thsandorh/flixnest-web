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
  provider: string;
  usesManifestProxy: boolean;
};

type ActivePlaybackSource = 'native' | 'addon';

type ProxyHeaders = Partial<Record<'referer' | 'origin' | 'user-agent', string>>;

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

const toPlaybackUrl = (candidateUrl: string, proxyHeaders?: ProxyHeaders) => {
  const hasProxyHeaders = Boolean(proxyHeaders && Object.keys(proxyHeaders).length > 0);
  if (!isPlaylistLikeUrl(candidateUrl)) return candidateUrl;

  const params = new URLSearchParams({
    url: candidateUrl,
  });

  if (hasProxyHeaders) {
    params.set('headers', JSON.stringify(proxyHeaders));
  }

  return `/api/media/playlist?${params.toString()}`;
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
  const [isResolvingStream, setIsResolvingStream] = useState<boolean>(true);
  const [activePlaybackSource, setActivePlaybackSource] = useState<ActivePlaybackSource>('native');

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

  const extractProxyHeaders = (raw: any): ProxyHeaders | undefined => {
    const requestHeaders = raw?.behaviorHints?.proxyHeaders?.request;
    if (!requestHeaders || typeof requestHeaders !== 'object') return undefined;

    const normalized: ProxyHeaders = {};

    const referer = requestHeaders.Referer || requestHeaders.referer;
    const origin = requestHeaders.Origin || requestHeaders.origin;
    const userAgent = requestHeaders['User-Agent'] || requestHeaders['user-agent'];

    if (typeof referer === 'string' && referer.trim()) {
      normalized.referer = referer.trim();
    }

    if (typeof origin === 'string' && origin.trim()) {
      normalized.origin = origin.trim();
    }

    if (typeof userAgent === 'string' && userAgent.trim()) {
      normalized['user-agent'] = userAgent.trim();
    }

    return Object.keys(normalized).length > 0 ? normalized : undefined;
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

          const proxyHeaders = extractProxyHeaders(item?.raw);
          const usesManifestProxy = isPlaylistLikeUrl(url);

          return {
            url: toPlaybackUrl(url, proxyHeaders),
            name: String(item?.name || ''),
            title: String(item?.raw?.title || ''),
            provider: String(item?.provider || ''),
            usesManifestProxy,
            hasProxyHeaders: Boolean(proxyHeaders),
          };
        })
        .filter(
          (item: (StreamCandidate & { hasProxyHeaders: boolean }) | null): item is StreamCandidate & {
            hasProxyHeaders: boolean;
          } => item !== null
        );

      const ordered = [...mapped].sort(
        (left: StreamCandidate & { hasProxyHeaders: boolean }, right: StreamCandidate & { hasProxyHeaders: boolean }) => {
          const leftPriority = left.hasProxyHeaders ? (left.usesManifestProxy ? 1 : 2) : 0;
          const rightPriority = right.hasProxyHeaders ? (right.usesManifestProxy ? 1 : 2) : 0;
          return leftPriority - rightPriority;
        }
      );

      const seen = new Set<string>();
      return ordered
        .filter((item: StreamCandidate & { hasProxyHeaders: boolean }) => {
          if (seen.has(item.url)) return false;
          seen.add(item.url);
          return true;
        })
        .map((item: StreamCandidate & { hasProxyHeaders: boolean }) => ({
          url: item.url,
          name: item.name,
          title: item.title,
          provider: item.provider,
          usesManifestProxy: item.usesManifestProxy,
        }));
    } catch {
      return [];
    }
  };

  const loadEpisodeSource = async (targetServerIndex: number, targetEpisodeIndex: number) => {
    const token = ++streamRequestTokenRef.current;
    setIsResolvingStream(true);
    setStreamCandidates([]);
    setActiveStreamIndex(0);
    const nativeLink = resolveEpisodeLink(targetServerIndex, targetEpisodeIndex);

    if (nativeLink) {
      if (token !== streamRequestTokenRef.current) return;
      setActivePlaybackSource('native');
      setEpisodeLink(nativeLink);
      setIsResolvingStream(false);
    }

    const addonCandidates = await fetchAddonCandidates(targetEpisodeIndex);
    if (token !== streamRequestTokenRef.current) return;

    setStreamCandidates(addonCandidates);

    if (nativeLink) {
      return;
    }

    if (addonCandidates.length > 0) {
      setActiveStreamIndex(0);
      setActivePlaybackSource('addon');
      setEpisodeLink(addonCandidates[0].url);
      setIsResolvingStream(false);
      return;
    }

    setEpisodeLink('');
    setIsResolvingStream(false);
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

  const handleSetAddonSource = (index: number) => {
    const selectedCandidate = streamCandidates[index];
    if (!selectedCandidate) return;

    setVideoProgress(null);
    setActiveStreamIndex(index);
    setActivePlaybackSource('addon');
    setEpisodeLink(selectedCandidate.url);
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
    setActivePlaybackSource('addon');
    setEpisodeLink(nextCandidate.url);
  };

  const hasMultipleServers = movie.episodes.length + streamCandidates.length > 1;

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
      ) : isResolvingStream ? (
        <div className="container-wrapper-movie px-4 lg:px-0">
          <div className="relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.18),_transparent_28%),linear-gradient(135deg,_rgba(24,24,27,0.96),_rgba(9,9,11,0.98))] p-6 lg:p-8">
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,transparent,rgba(255,255,255,0.05),transparent)] opacity-70" />
            <div className="relative flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-2xl space-y-4">
                <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] uppercase tracking-[0.32em] text-zinc-300 backdrop-blur">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-300/80" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-sky-200 shadow-[0_0_16px_rgba(125,211,252,0.9)]" />
                  </span>
                  Preparing Playback
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-semibold tracking-tight text-white lg:text-4xl">
                    Finding a clean stream for {movie.movie.name}
                  </h2>
                  <p className="max-w-xl text-sm leading-6 text-zinc-300 lg:text-base">
                    We are checking the available direct sources and locking onto the first stable
                    option.
                  </p>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[22rem]">
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur">
                  <div className="h-2 w-14 rounded-full bg-zinc-700/80" />
                  <div className="mt-4 h-3 w-24 animate-pulse rounded-full bg-white/15" />
                  <div className="mt-2 h-9 rounded-2xl bg-[linear-gradient(90deg,rgba(255,255,255,0.05),rgba(125,211,252,0.24),rgba(255,255,255,0.05))] bg-[length:200%_100%] animate-pulse" />
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur">
                  <div className="h-2 w-16 rounded-full bg-zinc-700/80" />
                  <div className="mt-4 h-3 w-20 animate-pulse rounded-full bg-white/15 [animation-delay:120ms]" />
                  <div className="mt-2 h-9 rounded-2xl bg-[linear-gradient(90deg,rgba(255,255,255,0.05),rgba(244,114,182,0.22),rgba(255,255,255,0.05))] bg-[length:200%_100%] animate-pulse [animation-delay:120ms]" />
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur">
                  <div className="h-2 w-12 rounded-full bg-zinc-700/80" />
                  <div className="mt-4 h-3 w-28 animate-pulse rounded-full bg-white/15 [animation-delay:240ms]" />
                  <div className="mt-2 h-9 rounded-2xl bg-[linear-gradient(90deg,rgba(255,255,255,0.05),rgba(74,222,128,0.2),rgba(255,255,255,0.05))] bg-[length:200%_100%] animate-pulse [animation-delay:240ms]" />
                </div>
              </div>
            </div>
            <div className="relative mt-6 flex flex-wrap gap-2 text-xs text-zinc-400 lg:text-sm">
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                Direct source matching
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                Adaptive stream check
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                Zero proxy playback
              </span>
            </div>
          </div>
        </div>
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
        streamCandidates={streamCandidates}
        activeStreamIndex={activeStreamIndex}
        activePlaybackSource={activePlaybackSource}
        handleSetServerIndex={handleSetServerIndex}
        handleSetAddonSource={handleSetAddonSource}
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
              <li key={index}>
                <button
                  type="button"
                  className={`tv-action block ${
                    episodeIndex === index
                      ? 'border-white/10 bg-[#5E5E5E] text-white'
                      : 'border-white/10 bg-white text-black hover:bg-[#d3d3d3]'
                  } px-2 lg:px-3 py-1.5 lg:py-2 rounded-md font-semibold text-sm lg:text-base`}
                  onClick={() => handleSwitchEpisode(index)}
                >
                  {`Episode ${index + 1}`}
                </button>
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
