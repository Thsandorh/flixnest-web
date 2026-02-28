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
  isWebCompatible: boolean;
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

const SERVICE_RETRY_DELAY_MS = 5_000;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export default function MovieWatchPage({ movie }: { movie: DetailMovie }) {
  const STREAM_CACHE_TTL_MS = 60_000;
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
  const [isUsingStremioPrimary, setIsUsingStremioPrimary] = useState(false);
  const [streamCandidates, setStreamCandidates] = useState<StreamCandidate[]>([]);
  const [activeStreamIndex, setActiveStreamIndex] = useState(0);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamCacheRef = useRef<Map<string, { expiresAt: number; candidates: StreamCandidate[] }>>(
    new Map()
  );
  const inFlightStreamRequestsRef = useRef<Map<string, Promise<StreamCandidate[]>>>(new Map());
  const kitsuSearchCacheRef = useRef<Map<string, { expiresAt: number; kitsuId: string }>>(new Map());
  const publicConfiguredAddonBaseUrl = (
    process.env.NEXT_PUBLIC_STREMIO_CONFIGURED_BASE_URL ||
    process.env.NEXT_PUBLIC_STREMIO_ADDON_BASE_URL ||
    ''
  )
    .replace(/\/manifest\.json$/i, '')
    .replace(/\/stream$/i, '')
    .replace(/\/+$/, '');
  const stremioType = movie.movie.tmdb?.type === 'tv' ? 'series' : 'movie';
  const isSeries = stremioType === 'series';
  const isAnimeLike = (movie.movie.category || []).some((item) =>
    String(item?.name || '')
      .toLowerCase()
      .includes('anime')
  );

  const resolveDefaultEpisodeLink = () => {
    return movie.episodes?.[0]?.server_data?.[0]?.link_m3u8 || '';
  };

  const resolveFallbackEpisodeLink = (targetServerIndex: number, targetEpisodeIndex: number) => {
    return movie.episodes?.[targetServerIndex]?.server_data?.[targetEpisodeIndex]?.link_m3u8 || '';
  };

  const readCachedCandidates = (cacheKey: string) => {
    const cached = streamCacheRef.current.get(cacheKey);
    if (!cached) return null;
    if (cached.expiresAt < Date.now()) {
      streamCacheRef.current.delete(cacheKey);
      return null;
    }
    return cached.candidates;
  };

  const writeCachedCandidates = (cacheKey: string, candidates: StreamCandidate[]) => {
    streamCacheRef.current.set(cacheKey, {
      expiresAt: Date.now() + STREAM_CACHE_TTL_MS,
      candidates,
    });
  };

  const fetchPrimaryStreams = async (targetEpisodeIndex = 0) => {
    const tmdbId = movie.movie.tmdb?.id;
    const queryEpisode = isSeries ? targetEpisodeIndex + 1 : undefined;
    const querySeason = isSeries ? movie.movie.tmdb?.season || 1 : undefined;
    const streamCacheKey = JSON.stringify({
      tmdbId: tmdbId || '',
      queryEpisode: queryEpisode || '',
      querySeason: querySeason || '',
      stremioType,
      title: movie.movie.origin_name || movie.movie.name || '',
      isAnimeLike,
    });

    const cachedCandidates = readCachedCandidates(streamCacheKey);
    if (cachedCandidates) return cachedCandidates;

    const inFlightRequest = inFlightStreamRequestsRef.current.get(streamCacheKey);
    if (inFlightRequest) return inFlightRequest;

    const mapStreamsToCandidates = (streams: any[]): StreamCandidate[] =>
      streams
        .map((stream): StreamCandidate | null => {
          const candidateUrl = stream?.url
            ? String(stream.url)
            : stream?.externalUrl
            ? String(stream.externalUrl)
            : stream?.ytId
            ? `https://www.youtube.com/watch?v=${stream.ytId}`
            : '';
          if (!candidateUrl) return null;

          const requestHeaders = stream?.behaviorHints?.proxyHeaders?.request;
          const requiresBlockedHeaders =
            !!requestHeaders &&
            (requestHeaders.Referer ||
              requestHeaders.referer ||
              requestHeaders.Origin ||
              requestHeaders.origin ||
              requestHeaders['User-Agent'] ||
              requestHeaders['user-agent']);

          return {
            url: toPlaybackUrl(candidateUrl),
            name: String(stream?.name || ''),
            title: String(stream?.title || ''),
            isWebCompatible: !requiresBlockedHeaders,
          };
        })
        .filter((candidate): candidate is StreamCandidate => candidate !== null)
        .sort((a, b) => Number(b.isWebCompatible) - Number(a.isWebCompatible));

    const appendSeasonEpisode = (base: string) => {
      if (!isSeries || !querySeason || !queryEpisode) return [base];
      return [base, `${base}:${querySeason}:${queryEpisode}`];
    };

    const fetchStremioStreamsFromProxy = async (params: Record<string, string | number | undefined>) => {
      const endpoint = new URL('/api/streams/stremio', window.location.origin);
      endpoint.searchParams.set('type', stremioType);
      endpoint.searchParams.set('id', String(params.id || '').trim());

      if (isSeries && querySeason) {
        endpoint.searchParams.set('season', String(querySeason));
      }
      if (isSeries && queryEpisode) {
        endpoint.searchParams.set('episode', String(queryEpisode));
      }

      const optionalParams: Array<keyof typeof params> = ['imdbId', 'tmdbId', 'kitsuId', 'aniwaysId'];
      optionalParams.forEach((key) => {
        const value = String(params[key] || '').trim();
        if (value) {
          endpoint.searchParams.set(key, value);
        }
      });

      const res = await fetch(endpoint.toString(), {
        method: 'GET',
        cache: 'no-store',
      });

      if (!res.ok) return [];

      const data = await res.json();
      const rawStreams = Array.isArray(data?.playable)
        ? data.playable.map((item: any) => item?.raw).filter(Boolean)
        : [];

      return mapStreamsToCandidates(rawStreams);
    };

    const fetchStremioStreamsFromPublicBase = async (
      params: Record<string, string | number | undefined>
    ) => {
      if (!publicConfiguredAddonBaseUrl) return [];

      const rawId = String(params.id || '').trim();
      const imdbId = String(params.imdbId || '').trim();
      const tmdbCandidate = String(params.tmdbId || params.id || '').trim();
      const kitsuCandidate = String(params.kitsuId || '').trim();
      const aniwaysCandidate = String(params.aniwaysId || '').trim();

      const candidatesRaw: string[] = [];
      if (rawId) {
        if (rawId.startsWith('tt') || rawId.includes(':')) {
          candidatesRaw.push(...appendSeasonEpisode(rawId));
        } else {
          candidatesRaw.push(...appendSeasonEpisode(`tmdb:${rawId}`));
        }
      }
      if (imdbId) {
        candidatesRaw.push(...appendSeasonEpisode(imdbId));
      }
      if (tmdbCandidate) {
        candidatesRaw.push(...appendSeasonEpisode(`tmdb:${tmdbCandidate}`));
      }
      if (kitsuCandidate) {
        if (isSeries && queryEpisode) {
          candidatesRaw.push(`kitsu:${kitsuCandidate}:${queryEpisode}`);
          if (querySeason) {
            candidatesRaw.push(`kitsu:${kitsuCandidate}:${querySeason}:${queryEpisode}`);
          }
        } else {
          candidatesRaw.push(`kitsu:${kitsuCandidate}`);
        }
      }
      if (aniwaysCandidate) {
        if (isSeries && queryEpisode) {
          candidatesRaw.push(`aniways:${aniwaysCandidate}:${queryEpisode}`);
          if (querySeason) {
            candidatesRaw.push(`aniways:${aniwaysCandidate}:${querySeason}:${queryEpisode}`);
          }
        } else {
          candidatesRaw.push(`aniways:${aniwaysCandidate}`);
        }
      }

      const idCandidates = Array.from(new Set(candidatesRaw.filter(Boolean)));
      for (const currentId of idCandidates) {
        const endpoint = new URL(
          `${publicConfiguredAddonBaseUrl}/stream/${encodeURIComponent(
            stremioType
          )}/${encodeURIComponent(currentId)}.json`
        );

        let res = await fetch(endpoint.toString(), {
          method: 'GET',
          cache: 'no-store',
        });

        if (res.status === 503) {
          await wait(SERVICE_RETRY_DELAY_MS);
          res = await fetch(endpoint.toString(), {
            method: 'GET',
            cache: 'no-store',
          });
        }

        if (!res.ok) continue;

        const data = await res.json();
        const candidates = mapStreamsToCandidates(Array.isArray(data?.streams) ? data.streams : []);
        if (candidates.length > 0) {
          return candidates;
        }
      }

      return [];
    };

    const fetchStremioStreams = async (params: Record<string, string | number | undefined>) => {
      const proxyCandidates = await fetchStremioStreamsFromProxy(params);
      if (proxyCandidates.length > 0) {
        return proxyCandidates;
      }

      return fetchStremioStreamsFromPublicBase(params);
    };

    const requestPromise = (async () => {
      try {
        if (tmdbId) {
          const tmdbStreams = await fetchStremioStreams({
            type: stremioType,
            id: String(tmdbId),
            season: querySeason,
            episode: queryEpisode,
          });
          if (tmdbStreams.length > 0) {
            writeCachedCandidates(streamCacheKey, tmdbStreams);
            return tmdbStreams;
          }
        }

        if (!isAnimeLike && !isSeries) {
          writeCachedCandidates(streamCacheKey, []);
          return [];
        }

        const resolverTitle = movie.movie.origin_name || movie.movie.name;
        if (!resolverTitle) {
          writeCachedCandidates(streamCacheKey, []);
          return [];
        }

        const kitsuCacheKey = resolverTitle.trim().toLowerCase();
        const cachedKitsu = kitsuSearchCacheRef.current.get(kitsuCacheKey);
        const kitsuId =
          cachedKitsu && cachedKitsu.expiresAt >= Date.now()
            ? cachedKitsu.kitsuId
            : await (async () => {
                const kitsuRes = await fetch(
                  `/api/anime/kitsu/search?title=${encodeURIComponent(resolverTitle)}&limit=5`,
                  { method: 'GET', cache: 'no-store' }
                );
                if (!kitsuRes.ok) return '';

                const kitsuData = await kitsuRes.json();
                const resolvedKitsuId = String(kitsuData?.kitsuId || '').trim();
                if (resolvedKitsuId) {
                  kitsuSearchCacheRef.current.set(kitsuCacheKey, {
                    expiresAt: Date.now() + STREAM_CACHE_TTL_MS,
                    kitsuId: resolvedKitsuId,
                  });
                }
                return resolvedKitsuId;
              })();

        if (!kitsuId) {
          writeCachedCandidates(streamCacheKey, []);
          return [];
        }

        const kitsuStreams = await fetchStremioStreams({
          type: stremioType,
          id: String(tmdbId || kitsuId),
          kitsuId: String(kitsuId),
          season: querySeason,
          episode: queryEpisode,
        });
        writeCachedCandidates(streamCacheKey, kitsuStreams);
        return kitsuStreams;
      } catch {
        writeCachedCandidates(streamCacheKey, []);
        return [];
      } finally {
        inFlightStreamRequestsRef.current.delete(streamCacheKey);
      }
    })();

    inFlightStreamRequestsRef.current.set(streamCacheKey, requestPromise);
    return requestPromise;
  };

  const applyPrimaryStreams = (candidates: StreamCandidate[]) => {
    setStreamCandidates(candidates);
    setActiveStreamIndex(0);
    setEpisodeLink(candidates[0]?.url || '');
  };

  const handleSwitchEpisode = (index: number) => {
    const applyEpisode = async () => {
      setEpisodeIndex(index);
      setVideoProgress(null);
      const stremioStreams = await fetchPrimaryStreams(index);
      if (stremioStreams.length > 0) {
        applyPrimaryStreams(stremioStreams);
        setIsUsingStremioPrimary(true);
        return;
      }

      setStreamCandidates([]);
      setActiveStreamIndex(0);
      setEpisodeLink(resolveFallbackEpisodeLink(serverIndex, index));
      setIsUsingStremioPrimary(false);
    };

    applyEpisode();
  };

  const handleSetServerIndex = (index: number) => {
    if (index === serverIndex) return;

    const applyServer = async () => {
      setServerIndex(index);
      setEpisodeIndex(0);
      setVideoProgress(null);
      const stremioStreams = await fetchPrimaryStreams(0);
      if (stremioStreams.length > 0) {
        applyPrimaryStreams(stremioStreams);
        setIsUsingStremioPrimary(true);
        return;
      }

      setStreamCandidates([]);
      setActiveStreamIndex(0);
      setEpisodeLink(resolveFallbackEpisodeLink(index, 0));
      setIsUsingStremioPrimary(false);
    };

    applyServer();
  };

  useEffect(() => {
    const initEpisode = async () => {
      // Stremio is now the primary source.
      const stremioStreams = await fetchPrimaryStreams();
      if (stremioStreams.length > 0) {
        applyPrimaryStreams(stremioStreams);
        setIsUsingStremioPrimary(true);
      } else {
        const defaultLink = resolveFallbackEpisodeLink(0, 0) || resolveDefaultEpisodeLink();
        setStreamCandidates([]);
        setActiveStreamIndex(0);
        setEpisodeLink(defaultLink);
        setIsUsingStremioPrimary(false);
      }
      setEpisodeIndex(0);
    };

    initEpisode();

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
    setIsUsingStremioPrimary(false);
    setIsShowToastProgress(false);
  };

  const handleRejectProgressWatch = () => {
    setIsShowToastProgress(false);
  };

  const handlePlaybackError = () => {
    if (!isUsingStremioPrimary) return;

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
      {isUsingStremioPrimary && (
        <div className="text-center text-xs lg:text-sm text-gray-400 px-4">
          Playing via your Stremio stream source.
        </div>
      )}
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
