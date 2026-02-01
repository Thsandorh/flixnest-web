'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  Plus,
  Check,
  Star,
  Calendar,
  Clock,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  Loader2,
  Radio,
  Copy,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'sonner';

import { MediaCard } from '@/components/ui/media-card';
import VideoPlayer from '@/components/player/video-player';
import {
  useHistoryStore,
  useWatchlistStore,
  useAddonStore,
  useNotificationStore,
  useSettingsStore,
  type Addon,
} from '@/store';
import { buildProxyUrl } from '@/lib/stream-utils';
import { extractImdbId, getMeta, getStreams, getSubtitles, getTmdbFromImdb, parseStreamInfo, type Stream } from '@/lib/stremio';

const TMDB_API_KEY = 'ffe7ef8916c61835264d2df68276ddc2';
const TMDB_BASE = 'https://api.themoviedb.org/3';
const USATV_MANIFEST_URL = 'https://848b3516657c-usatv.baby-beamup.club/manifest.json';

interface Episode {
  id: number;
  episode_number: number;
  name: string;
  overview: string;
  still_path: string | null;
  air_date: string;
  runtime: number | null;
  vote_average: number;
}

interface Season {
  id: number;
  season_number: number;
  name: string;
  episode_count: number;
  episodes?: Episode[];
}

const isSubtitleAddon = (addon: Addon): boolean => {
  if (addon.resources?.includes('subtitles')) return true;
  if (addon.id === 'submaker') return true;
  return addon.manifest.includes('submaker.elfhosted.com');
};

export default function WatchPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const type = params.type as 'movie' | 'tv';
  const rawId = params.id as string;

  const seasonParam = searchParams.get('season');
  const episodeParam = searchParams.get('episode');

  const [selectedSeason, setSelectedSeason] = useState(1);
  const [selectedEpisode, setSelectedEpisode] = useState(1);
  const [availableStreams, setAvailableStreams] = useState<Stream[]>([]);
  const [selectedStream, setSelectedStream] = useState<Stream | null>(null);
  const [subtitles, setSubtitles] = useState<Array<{ src: string; label: string; srclang: string }>>([]);
  const [showAllSubtitles, setShowAllSubtitles] = useState(false);
  const [selectedSubtitleSrc, setSelectedSubtitleSrc] = useState<string | null>(null);
  const [isLoadingStream, setIsLoadingStream] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [isSeasonExpanded, setIsSeasonExpanded] = useState(true);
  const [isStreamListExpanded, setIsStreamListExpanded] = useState(false);
  const [isPlayerListExpanded, setIsPlayerListExpanded] = useState(false);
  const [hasSyncedParams, setHasSyncedParams] = useState(false);
  const [resolvedTmdbId, setResolvedTmdbId] = useState<string | null>(
    /^\d+$/.test(rawId) ? rawId : null
  );
  const [isResolvingId, setIsResolvingId] = useState(!/^\d+$/.test(rawId));

  const { activeAddons } = useAddonStore();
  const { isInWatchlist, toggleWatchlist } = useWatchlistStore();
  const { autoSelectSubtitles, preferredSubtitleLanguages } = useSettingsStore();
  const { isEpisodeWatched, getEpisodeProgress } = useHistoryStore();
  const addNotification = useNotificationStore((state) => state.addNotification);
  const subtitleAddons = useMemo(
    () => activeAddons.filter(isSubtitleAddon),
    [activeAddons]
  );
  const subtitleAddonManifests = useMemo(
    () => subtitleAddons.map((addon) => addon.manifest),
    [subtitleAddons]
  );
  const subtitleAddonManifestsKey = subtitleAddonManifests.join('|');
  const subtitleSourceLabel = useMemo(() => {
    if (subtitleAddons.length === 1) return subtitleAddons[0].name;
    if (subtitleAddons.length > 1) return 'Multiple providers';
    return null;
  }, [subtitleAddons]);
  const contentId = resolvedTmdbId ?? rawId;
  const isVixSrcUrl = (url?: string | null) => {
    if (!url) return false;
    try {
      const parsed = new URL(url);
      return parsed.hostname.toLowerCase().includes('vixsrc.');
    } catch {
      return url.toLowerCase().includes('vixsrc.');
    }
  };

  useEffect(() => {
    if (/^\d+$/.test(rawId)) {
      setResolvedTmdbId(rawId);
      setIsResolvingId(false);
      return;
    }

    let isActive = true;
    const resolveId = async () => {
      setIsResolvingId(true);
      const imdbId = extractImdbId(rawId);
      if (!imdbId) {
        if (isActive) {
          setResolvedTmdbId(null);
          setIsResolvingId(false);
        }
        return;
      }

      const tmdbId = await getTmdbFromImdb(imdbId, type);
      if (isActive) {
        setResolvedTmdbId(tmdbId);
        setIsResolvingId(false);
      }
    };

    resolveId();
    return () => {
      isActive = false;
    };
  }, [rawId, type]);

  useEffect(() => {
    if (seasonParam) {
      const parsedSeason = parseInt(seasonParam);
      if (!Number.isNaN(parsedSeason)) {
        setSelectedSeason(parsedSeason);
      }
    }
    if (episodeParam) {
      const parsedEpisode = parseInt(episodeParam);
      if (!Number.isNaN(parsedEpisode)) {
        setSelectedEpisode(parsedEpisode);
      }
    }
    setHasSyncedParams(true);
  }, [seasonParam, episodeParam]);

  // Fetch media details
  const { data: tmdbDetails, isLoading: detailsLoading } = useQuery({
    queryKey: ['details', type, resolvedTmdbId],
    queryFn: async () => {
      if (!resolvedTmdbId) return null;
      const { data } = await axios.get(
        `${TMDB_BASE}/${type}/${resolvedTmdbId}?api_key=${TMDB_API_KEY}&append_to_response=external_ids,credits,videos`
      );
      return data;
    },
    enabled: !!resolvedTmdbId,
  });

  // Fetch season details for TV
  const { data: seasonDetails } = useQuery({
    queryKey: ['season', resolvedTmdbId, selectedSeason],
    queryFn: async () => {
      const { data } = await axios.get(
        `${TMDB_BASE}/tv/${resolvedTmdbId}/season/${selectedSeason}?api_key=${TMDB_API_KEY}`
      );
      return data;
    },
    enabled: type === 'tv' && !!resolvedTmdbId,
  });

  // Fetch recommendations
  const { data: recommendations } = useQuery({
    queryKey: ['recommendations', type, resolvedTmdbId],
    queryFn: async () => {
      const { data } = await axios.get(
        `${TMDB_BASE}/${type}/${resolvedTmdbId}/recommendations?api_key=${TMDB_API_KEY}`
      );
      return data.results?.slice(0, 12);
    },
    enabled: !!resolvedTmdbId,
  });

  const { data: stremioMeta, isLoading: stremioMetaLoading } = useQuery({
    queryKey: ['stremio-meta', type, rawId, activeAddons.map((addon) => addon.manifest).join('|')],
    queryFn: async () => {
      if (!rawId) return null;
      const typeCandidates = type === 'tv' ? ['tv', 'series'] : ['movie'];

      for (const addon of activeAddons) {
        for (const metaType of typeCandidates) {
          const meta = await getMeta(addon.manifest, metaType, rawId);
          if (meta) {
            return meta;
          }
        }
      }

      return null;
    },
    enabled: !resolvedTmdbId && activeAddons.length > 0,
  });

  const fallbackDetails = useMemo(() => {
    if (stremioMeta) {
      const yearMatch = stremioMeta.releaseInfo?.match(/\b(19|20)\d{2}\b/);
      const year = yearMatch ? yearMatch[0] : undefined;
      const rating =
        stremioMeta.imdbRating !== undefined ? Number(stremioMeta.imdbRating) : undefined;
      const genres = stremioMeta.genres?.map((genre, index) => ({
        id: index + 1,
        name: genre,
      }));

      return {
        title: stremioMeta.name,
        name: stremioMeta.name,
        poster_path: stremioMeta.poster,
        backdrop_path: stremioMeta.background,
        overview: stremioMeta.description || '',
        vote_average: Number.isFinite(rating ?? NaN) ? rating : undefined,
        release_date: year ? `${year}-01-01` : undefined,
        first_air_date: year ? `${year}-01-01` : undefined,
        genres,
        external_ids: {
          imdb_id: stremioMeta.imdb_id || stremioMeta.imdbId,
        },
        imdb_id: stremioMeta.imdb_id || stremioMeta.imdbId,
      };
    }

    if (!resolvedTmdbId && rawId) {
      return {
        title: rawId,
        name: rawId,
        poster_path: null,
        backdrop_path: null,
        overview: '',
        genres: [],
      };
    }

    return null;
  }, [stremioMeta, rawId, resolvedTmdbId]);

  const details = tmdbDetails ?? fallbackDetails;
  const imdbId = details?.external_ids?.imdb_id || details?.imdb_id || extractImdbId(rawId);
  const streamId = imdbId ?? rawId;
  const isUsaTvContent = type === 'tv' && rawId.startsWith('ustv-');
  const hasEpisodeContext = type === 'tv' && !!imdbId && !isUsaTvContent;
  const streamTypes = useMemo(
    () => {
      if (type === 'movie') return ['movie'];
      // For USA TV channels, try 'channel', 'tv', and 'series' types
      if (isUsaTvContent) return ['channel', 'tv', 'series'] as Array<'movie' | 'series' | 'tv' | 'channel'>;
      // For regular TV shows, use series if we have IMDB ID, otherwise try both
      return imdbId ? ['series'] : ['tv', 'series'];
    },
    [type, imdbId, isUsaTvContent]
  );
  const streamKey = useMemo(
    () =>
      `${streamId}|${streamTypes.join(',')}|${hasEpisodeContext ? `${selectedSeason}:${selectedEpisode}` : ''}`,
    [streamId, streamTypes, hasEpisodeContext, selectedSeason, selectedEpisode]
  );
  const lastGoodStreamsRef = useRef<{ key: string; streams: Stream[]; selected: Stream | null }>({
    key: '',
    streams: [],
    selected: null,
  });
  const availableStreamsRef = useRef<Stream[]>([]);
  const selectedStreamRef = useRef<Stream | null>(null);
  const trailer = useMemo(() => {
    const videos = details?.videos?.results;
    if (!Array.isArray(videos) || videos.length === 0) return null;

    const youtube = videos.filter((video: any) => video.site === 'YouTube' && video.key);
    if (youtube.length === 0) return null;

    const pick =
      youtube.find((video: any) => video.type === 'Trailer' && video.official) ||
      youtube.find((video: any) => video.type === 'Trailer') ||
      youtube.find((video: any) => video.type === 'Teaser' && video.official) ||
      youtube.find((video: any) => video.type === 'Teaser') ||
      youtube[0];

    return pick ? { key: pick.key as string, name: pick.name as string } : null;
  }, [details?.videos?.results]);

  useEffect(() => {
    availableStreamsRef.current = availableStreams;
  }, [availableStreams]);

  useEffect(() => {
    selectedStreamRef.current = selectedStream;
  }, [selectedStream]);

  // Fetch streams from ALL active addons
  useEffect(() => {
    if (!streamId || activeAddons.length === 0) return;

    const fetchAllStreams = async () => {
      setIsLoadingStream(true);
      setStreamError(null);

      try {
        const subtitleType = hasEpisodeContext ? 'series' : type;

        // Fetch from all active addons in parallel
        const streamPromises = activeAddons.map((addon) =>
          Promise.all(
            streamTypes.map((streamType) =>
              getStreams(
                addon.manifest,
                streamType as 'movie' | 'series' | 'tv' | 'channel',
                streamId,
                streamType === 'series' && hasEpisodeContext ? selectedSeason : undefined,
                streamType === 'series' && hasEpisodeContext ? selectedEpisode : undefined
              ).catch(() => [] as Stream[])
            )
          )
            .then((results) => results.flat())
            .then((streams) =>
              streams.map((stream) => ({
                ...stream,
                addonManifest: addon.manifest,
                addonName: addon.name,
              }))
            )
            .catch(() => [] as Stream[])
        );

        const results = await Promise.all(streamPromises);
        const allStreams = results.flat();

        // Remove duplicates by URL
        const uniqueStreams = allStreams.filter((stream, index, self) =>
          stream.url && self.findIndex(s => s.url === stream.url) === index
        );

        if (uniqueStreams.length > 0) {
          setAvailableStreams(uniqueStreams);
          setStreamError(null); // Clear any previous error when streams are found

          let preferredStream: Stream | null = null;
          if (isUsaTvContent) {
            // Auto-select first stream from USA TV if available
            preferredStream =
              uniqueStreams.find((stream) => stream.addonManifest === USATV_MANIFEST_URL) ?? null;
            if (preferredStream?.url) {
              console.log('[Watch] Auto-selecting stream:', preferredStream.name || preferredStream.title);
              setSelectedStream(preferredStream);
              setIsPlayerListExpanded(true);
              const info = parseStreamInfo(preferredStream);
              toast.success(`Found ${uniqueStreams.length} stream(s) - Playing ${info.source}`, {
                duration: 3000,
              });
            } else {
              setSelectedStream(null);
            }
          } else {
            // Auto-select for external player options (no inline playback)
            preferredStream =
              uniqueStreams.find((stream) => !isVixSrcUrl(stream.url)) ??
              uniqueStreams[0] ??
              null;
            if (preferredStream?.url) {
              console.log('[Watch] Auto-selecting stream:', preferredStream.name || preferredStream.title);
              setSelectedStream(preferredStream);
              setIsPlayerListExpanded(true);
              const info = parseStreamInfo(preferredStream);
              toast.success(`Found ${uniqueStreams.length} stream(s) - Ready ${info.source}`, {
                duration: 3000,
              });
            } else {
              setSelectedStream(null);
            }
          }

          lastGoodStreamsRef.current = {
            key: streamKey,
            streams: uniqueStreams,
            selected: preferredStream ?? null,
          };
        } else {
          if (lastGoodStreamsRef.current.key === streamKey && lastGoodStreamsRef.current.streams.length > 0) {
            setAvailableStreams(lastGoodStreamsRef.current.streams);
            if (lastGoodStreamsRef.current.selected) {
              setSelectedStream(lastGoodStreamsRef.current.selected);
            }
            setStreamError(null);
          } else if (availableStreamsRef.current.length > 0) {
            setAvailableStreams(availableStreamsRef.current);
            if (selectedStreamRef.current) {
              setSelectedStream(selectedStreamRef.current);
            }
            setStreamError(null);
          } else {
            setAvailableStreams([]);
            setSelectedStream(null);
            setStreamError('No streams found. Try different addons.');
          }
        }

        // Fetch subtitles from active subtitle addons only
        if (subtitleAddonManifests.length > 0) {
          const subs = await getSubtitles(
            streamId,
            subtitleType as 'movie' | 'series' | 'tv' | 'channel',
            subtitleType === 'series' ? selectedSeason : undefined,
            subtitleType === 'series' ? selectedEpisode : undefined,
            subtitleAddonManifests
          );

          const mappedSubtitles = subs.map((sub, index) => ({
            src: sub.url,
            label: `${sub.lang}${subs.length > 1 ? ` #${index + 1}` : ''}`,
            srclang: sub.lang.toLowerCase().slice(0, 2),
          }));

          setSubtitles(mappedSubtitles);
          setShowAllSubtitles(false);

          // Auto-select subtitle based on user preferences
          if (autoSelectSubtitles && mappedSubtitles.length > 0) {
            let selectedSubtitle = mappedSubtitles[0];

            // Try to find a subtitle matching preferred languages in order
            for (const preferredLang of preferredSubtitleLanguages) {
              const match = mappedSubtitles.find((sub) => sub.srclang === preferredLang);
              if (match) {
                selectedSubtitle = match;
                break;
              }
            }

            setSelectedSubtitleSrc(selectedSubtitle.src);
          } else {
            setSelectedSubtitleSrc(subs[0]?.url ?? null);
          }
        } else {
          setSubtitles([]);
          setShowAllSubtitles(false);
          setSelectedSubtitleSrc(null);
        }
      } catch (error) {
        console.error('Stream fetch error:', error);
        if (lastGoodStreamsRef.current.key === streamKey && lastGoodStreamsRef.current.streams.length > 0) {
          setAvailableStreams(lastGoodStreamsRef.current.streams);
          if (lastGoodStreamsRef.current.selected) {
            setSelectedStream(lastGoodStreamsRef.current.selected);
          }
          setStreamError(null);
        } else if (availableStreamsRef.current.length > 0) {
          setAvailableStreams(availableStreamsRef.current);
          if (selectedStreamRef.current) {
            setSelectedStream(selectedStreamRef.current);
          }
          setStreamError(null);
        } else {
          setStreamError('Failed to fetch streams. Please try again.');
        }
      } finally {
        setIsLoadingStream(false);
      }
    };

    fetchAllStreams();
  }, [
    streamId,
    streamTypes,
    hasEpisodeContext,
    activeAddons,
    type,
    selectedSeason,
    selectedEpisode,
    subtitleAddonManifestsKey,
    addNotification,
  ]);

  // Update URL when episode changes
  useEffect(() => {
    if (!hasSyncedParams) return;
    if (type === 'tv' && hasEpisodeContext) {
      const newUrl = `/watch/tv/${rawId}?season=${selectedSeason}&episode=${selectedEpisode}`;
      router.replace(newUrl, { scroll: false });
    }
  }, [hasSyncedParams, hasEpisodeContext, selectedSeason, selectedEpisode, rawId, type, router]);

  const currentEpisode = seasonDetails?.episodes?.find(
    (ep: Episode) => ep.episode_number === selectedEpisode
  );

  const getEpisodeStatus = (season: number, episode: number) => {
    const watched = isEpisodeWatched(contentId, season, episode);
    const progress = getEpisodeProgress(contentId, season, episode);
    const isCurrent = season === selectedSeason && episode === selectedEpisode;

    if (isCurrent) return 'current';
    if (watched) return 'watched';
    if (progress > 0) return 'in-progress';
    return 'unwatched';
  };

  const handleEpisodeClick = (season: number, episode: number) => {
    setSelectedSeason(season);
    setSelectedEpisode(episode);
    setAvailableStreams([]);
    setSelectedStream(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStreamSelect = (stream: Stream) => {
    if (!stream.url) return;

    setSelectedStream(stream);
    const info = parseStreamInfo(stream);
    setIsStreamListExpanded(false);
    setIsPlayerListExpanded(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const playbackUrl = selectedStream?.url ?? null;
  const allowInlinePlayback =
    isUsaTvContent && selectedStream?.addonManifest === USATV_MANIFEST_URL;
  const playerSubtitles = useMemo(
    () =>
      subtitles.map((subtitle) => ({
        ...subtitle,
        src: buildProxyUrl(subtitle.src),
      })),
    [subtitles]
  );

  const selectedSubtitleItem =
    subtitles.find((subtitle) => subtitle.src === selectedSubtitleSrc) ?? subtitles[0] ?? null;

  const normalizeStreamUrl = (url: string) => {
    let cleaned = url.trim();

    if (/^vlc:\/\//i.test(cleaned)) {
      cleaned = cleaned.replace(/^vlc:\/\//i, '');
    }

    cleaned = cleaned.replace(/^http:\/(?!\/)/i, 'http://');
    cleaned = cleaned.replace(/^https:\/(?!\/)/i, 'https://');
    cleaned = cleaned.replace(/^(https?)\/\/(?!\/)/i, '$1://');

    return cleaned;
  };

  const getHeaderValue = (headers: Record<string, string> | undefined, key: string) => {
    if (!headers) return undefined;
    const target = key.toLowerCase();
    const entry = Object.entries(headers).find(([headerKey]) => headerKey.toLowerCase() === target);
    return entry?.[1];
  };

  const buildVlcHeaderOptions = (headers: Record<string, string> | undefined) => {
    const options: string[] = [];
    const userAgent = getHeaderValue(headers, 'user-agent');
    const referer = getHeaderValue(headers, 'referer') || getHeaderValue(headers, 'referrer');

    if (userAgent) {
      options.push(`#EXTVLCOPT:http-user-agent=${userAgent}`);
    }
    if (referer) {
      options.push(`#EXTVLCOPT:http-referrer=${referer}`);
    }

    return options;
  };

  const downloadM3U = (url: string, title?: string, headers?: Record<string, string>) => {
    const normalizedUrl = normalizeStreamUrl(url);
    const displayTitle = title || 'Stream';
    const safeTitle = displayTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    const filename = safeTitle ? `${safeTitle}.m3u` : 'stream.m3u';
    const headerOptions = buildVlcHeaderOptions(headers);
    // Add EXTINF with title so VLC displays the movie name
    const content = ['#EXTM3U', ...headerOptions, `#EXTINF:-1,${displayTitle}`, normalizedUrl, ''].join('\n');

    const blob = new Blob([content], { type: 'audio/x-mpegurl' });
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(objectUrl);
  };

  const normalizeSubtitleUrl = (url: string) => {
    if (!url) return '';

    // If it's a protocol-relative URL, add https:
    if (url.startsWith('//')) return `https:${url}`;

    // If it's already an absolute URL, return as-is
    if (url.startsWith('http://') || url.startsWith('https://')) return url;

    // Allow our internal proxy URLs (which might be relative at this point)
    if (url.startsWith('/api/proxy')) return url;

    // If it's a relative URL, we can't use it in M3U for VLC
    console.warn('[M3U] Skipping relative subtitle URL:', url);
    return '';
  };

  const getSubtitleExtension = (url: string) => {
    const match = url.match(/\.([a-z0-9]+)(?:\?|#|$)/i);
    if (!match) return 'srt';
    const ext = match[1].toLowerCase();
    const allowed = new Set(['srt', 'vtt', 'ass', 'ssa', 'sub', 'txt']);
    return allowed.has(ext) ? ext : 'srt';
  };

  const downloadSubtitleFile = async (url: string, baseName: string) => {
    try {
      const response = await fetch(buildProxyUrl(url));
      if (!response.ok) {
        throw new Error(`Subtitle fetch failed (${response.status})`);
      }
      const blob = await response.blob();
      const ext = getSubtitleExtension(url);
      const subtitleName = `${baseName}.${ext}`;
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = subtitleName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (error) {
      console.error('Subtitle download error:', error);
      toast.error('Failed to download subtitle');
    }
  };

  const downloadM3UWithSubtitle = async (
    url: string,
    subtitleItem: { src: string; srclang: string },
    title?: string,
    headers?: Record<string, string>
  ) => {
    const normalizedUrl = normalizeStreamUrl(url);
    const displayTitle = title || 'Stream';
    const safeTitle = displayTitle
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    const filename = safeTitle ? `${safeTitle}-with-subs.m3u` : 'stream-with-subs.m3u';

    const normalizedSubtitle = normalizeSubtitleUrl(subtitleItem.src);
    const headerOptions = buildVlcHeaderOptions(headers);

    const lines = ['#EXTM3U', ...headerOptions];
    if (normalizedSubtitle) {
      lines.push(`#EXTVLCOPT:input-slave=${normalizedSubtitle}`);
    }
    // Add EXTINF with title so VLC displays the movie name
    lines.push(`#EXTINF:-1,${displayTitle}`);
    lines.push(normalizedUrl, '');
    const content = lines.join('\n');

    const blob = new Blob([content], { type: 'audio/x-mpegurl' });
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(objectUrl);

    if (normalizedSubtitle) {
      await downloadSubtitleFile(normalizedSubtitle, safeTitle || 'stream');
    }
  };

  const isMobileDevice = () =>
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent || ''
    );

  const getVlcLink = (url: string) => {
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
    const isIOS = /iPhone|iPad|iPod/i.test(ua);
    const isAndroid = /Android/i.test(ua);
    const normalizedUrl = normalizeStreamUrl(url);

    if (isIOS) {
      return `vlc-x-callback://x-callback-url/stream?url=${encodeURIComponent(normalizedUrl)}`;
    }

    if (isAndroid) {
      return `intent:${normalizedUrl}#Intent;package=org.videolan.vlc;action=android.intent.action.VIEW;type=video/*;end`;
    }

    return `vlc:${normalizedUrl}`;
  };

  const playerOptions = [
    {
      id: 'vlc',
      name: 'VLC',
      description: 'Android, iOS, Desktop',
      getLink: (url: string) => getVlcLink(url),
    },
    {
      id: 'infuse',
      name: 'Infuse',
      description: 'iOS / iPadOS',
      getLink: (url: string) =>
        `infuse://x-callback-url/play?url=${encodeURIComponent(url)}`,
    },
    {
      id: 'outplayer',
      name: 'Outplayer',
      description: 'iOS / iPadOS',
      getLink: (url: string) =>
        `outplayer://play?url=${encodeURIComponent(url)}`,
    },
    {
      id: 'just-player',
      name: 'Just Player',
      description: 'Android',
      getLink: (url: string) =>
        `intent:${url}#Intent;package=com.brouken.player;type=video/*;end`,
    },
    {
      id: 'mx-player',
      name: 'MX Player',
      description: 'Android',
      getLink: (url: string) =>
        `intent:${url}#Intent;package=com.mxtech.videoplayer.ad;type=video/*;end`,
    },
  ];

  const handleCopyUrl = async () => {
    if (!playbackUrl) return;
    try {
      await navigator.clipboard.writeText(playbackUrl);
      toast.success('Stream link copied');
    } catch (error) {
      console.error('Copy failed:', error);
      toast.error('Failed to copy link');
    }
  };

  const inWatchlist = isInWatchlist(contentId);

  const handleWatchlistToggle = () => {
    if (!details) return;
    toggleWatchlist({
      id: contentId,
      type: type,
      title: details.title || details.name,
      poster: details.poster_path,
      backdrop: details.backdrop_path,
    });
    toast.success(inWatchlist ? 'Removed from list' : 'Added to list');
  };

  const isDetailsLoading = isResolvingId || detailsLoading || (!tmdbDetails && stremioMetaLoading);

  if (isDetailsLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-red-500 animate-spin" />
      </div>
    );
  }

  if (!details) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <p className="text-white">Content not found</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 pt-16 pb-24">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        {allowInlinePlayback && playbackUrl && (
          <div className="mb-6">
            <VideoPlayer
              src={playbackUrl}
              poster={
                details?.backdrop_path
                  ? `https://image.tmdb.org/t/p/original${details.backdrop_path}`
                  : details?.poster_path
                  ? `https://image.tmdb.org/t/p/w780${details.poster_path}`
                  : undefined
              }
              title={details?.title || details?.name}
              subtitles={playerSubtitles}
              headers={selectedStream.headers}
              disableProxy={true}
            />
          </div>
        )}
        {/* External Player */}
        <div className="mb-6">
          <div className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-900 via-zinc-950 to-zinc-900 p-6">
            <div className="flex flex-col lg:flex-row gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-red-500/20 rounded-lg">
                    <Sparkles className="w-5 h-5 text-red-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-white">Play in External Player</h2>
                    <p className="text-sm text-zinc-400">
                      No built-in player - pick a stream, then open it in your preferred app.
                    </p>
                  </div>
                </div>

                {isLoadingStream ? (
                  <div className="flex items-center gap-3 text-zinc-300">
                    <Loader2 className="w-5 h-5 animate-spin text-red-400" />
                    <span>Searching streams from active addons...</span>
                  </div>
                ) : streamError ? (
                  <div className="flex items-center gap-3 text-red-400">
                    <AlertCircle className="w-5 h-5" />
                    <span>{streamError}</span>
                  </div>
                ) : selectedStream && playbackUrl ? (
                  <div className="space-y-4">
                    <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-4">
                      <div className="flex items-center justify-between gap-4 flex-wrap">
                        <div>
                          <p className="text-xs uppercase tracking-wide text-zinc-500">Selected stream</p>
                          <p className="text-lg font-semibold text-white">
                            {parseStreamInfo(selectedStream).source}
                          </p>
                          <p className="text-sm text-zinc-400">
                            {selectedStream.name || selectedStream.title || 'Stream'}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => setIsPlayerListExpanded((prev) => !prev)}
                            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                          >
                            <Play className="w-4 h-4" />
                            Choose Player
                          </button>
                          <button
                            onClick={handleCopyUrl}
                            className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors"
                          >
                            <Copy className="w-4 h-4" />
                            Copy Link
                          </button>
                          {subtitles.length > 0 && selectedSubtitleItem && (
                            <button
                              onClick={() =>
                                downloadM3UWithSubtitle(
                                  playbackUrl,
                                  selectedSubtitleItem,
                                  details?.title || details?.name,
                                  selectedStream?.headers
                                )
                              }
                              className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors"
                              title="Download video with selected subtitle"
                            >
                              <Copy className="w-4 h-4" />
                              Video + Subtitle
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    <AnimatePresence>
                      {isPlayerListExpanded && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="grid grid-cols-1 md:grid-cols-2 gap-3"
                        >
                          {playerOptions.map((player) => {
                            if (player.id === 'vlc') {
                              return (
                                <a
                                  key={player.id}
                                  href={player.getLink(playbackUrl)}
                                  onClick={(event) => {
                                    if (isMobileDevice()) return;
                                    event.preventDefault();
                                    downloadM3U(playbackUrl, details?.title || details?.name, selectedStream?.headers);
                                  }}
                                  className="group flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 hover:border-red-500/60 hover:bg-zinc-900 transition-colors"
                                >
                                  <div>
                                    <p className="text-white font-semibold">{player.name}</p>
                                    <p className="text-sm text-zinc-400">{player.description}</p>
                                  </div>
                                  <ExternalLink className="w-5 h-5 text-zinc-500 group-hover:text-red-400" />
                                </a>
                              );
                            }

                            return (
                              <a
                                key={player.id}
                                href={player.getLink(playbackUrl)}
                                className="group flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 hover:border-red-500/60 hover:bg-zinc-900 transition-colors"
                              >
                                <div>
                                  <p className="text-white font-semibold">{player.name}</p>
                                  <p className="text-sm text-zinc-400">{player.description}</p>
                                </div>
                                <ExternalLink className="w-5 h-5 text-zinc-500 group-hover:text-red-400" />
                              </a>
                            );
                          })}

                          {/* Download M3U + Subtitle Button */}
                          {subtitles.length > 0 && selectedSubtitleItem && (
                            <button
                              onClick={() => downloadM3UWithSubtitle(playbackUrl, selectedSubtitleItem, details?.title || details?.name, selectedStream?.headers)}
                              className="group flex items-center justify-between rounded-xl border border-blue-600 bg-blue-600/10 p-4 hover:border-blue-500 hover:bg-blue-600/20 transition-colors"
                            >
                              <div>
                                <p className="text-white font-semibold">Video + Subtitle</p>
                                <p className="text-sm text-blue-300">M3U with {selectedSubtitleItem.label}</p>
                              </div>
                              <svg className="w-5 h-5 text-blue-400 group-hover:text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                              </svg>
                            </button>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ) : (
                  <p className="text-zinc-400">
                    Select a stream to show player options.
                  </p>
                )}
              </div>

              <div className="lg:w-80 rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
                <h3 className="text-sm font-semibold text-white mb-3">Quick tips</h3>
                <ul className="space-y-2 text-sm text-zinc-400">
                  <li>- For Torrentio, debrid is configured inside the addon.</li>
                  <li>- Scraper addons only list streams - playback always happens in an external app.</li>
                  <li>- Subtitle sources come from active subtitle addons (e.g., SubMaker).</li>
                </ul>
              </div>

              {subtitles.length > 0 && (
                <div className="lg:w-80 rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
                  <h3 className="text-sm font-semibold text-white mb-3">
                    Subtitles{subtitleSourceLabel ? ` (${subtitleSourceLabel})` : ''}
                  </h3>
                  <div className="space-y-2">
                    {(showAllSubtitles ? subtitles : subtitles.slice(0, 10)).map((subtitle) => (
                      <button
                        key={subtitle.src}
                        onClick={() => setSelectedSubtitleSrc(subtitle.src)}
                        className={`flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left transition-colors ${
                          selectedSubtitleSrc === subtitle.src
                            ? 'border-red-500/60 bg-red-500/10'
                            : 'border-zinc-800 bg-zinc-900/40 hover:border-zinc-700'
                        }`}
                      >
                        <span className="text-xs text-zinc-200">{subtitle.label}</span>
                        <a
                          href={buildProxyUrl(subtitle.src)}
                          className="text-xs text-red-400 hover:text-red-300"
                          target="_blank"
                          rel="noreferrer"
                          onClick={(event) => event.stopPropagation()}
                        >
                          Download
                        </a>
                      </button>
                    ))}
                    {subtitles.length > 10 && (
                      <button
                        onClick={() => setShowAllSubtitles((prev) => !prev)}
                        className="w-full rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-2 text-xs text-zinc-300 hover:text-white hover:border-zinc-700 transition-colors"
                      >
                        {showAllSubtitles ? 'Show less' : `Show ${subtitles.length - 10} more`}
                      </button>
                    )}
                    <p className="text-[11px] text-zinc-500">
                      Not seeing your subtitle? Try installing a new, custom subtitle addon.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions - Sticky bar for Video+Subtitle download */}
        {selectedStream && playbackUrl && subtitles.length > 0 && selectedSubtitleItem && (
          <div className="sticky top-16 z-40 mb-4">
            <div className="flex items-center justify-between gap-3 p-3 rounded-xl border border-blue-600/50 bg-zinc-900/95 backdrop-blur-sm">
              <div className="flex items-center gap-3 text-sm text-zinc-300">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span>Stream ready: {parseStreamInfo(selectedStream).source}</span>
              </div>
              <button
                onClick={() =>
                  downloadM3UWithSubtitle(
                    playbackUrl,
                    selectedSubtitleItem,
                    details?.title || details?.name,
                    selectedStream?.headers
                  )
                }
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
                title="Download video with selected subtitle"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Video + Subtitle
              </button>
            </div>
          </div>
        )}

        {/* Stream Selector */}
        {availableStreams.length > 0 && (
          <div className="mb-6">
            <button
              onClick={() => setIsStreamListExpanded(!isStreamListExpanded)}
              className="flex items-center justify-between w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg hover:bg-zinc-700 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Radio className="w-5 h-5 text-red-500" />
                <span className="text-white font-medium">
                  {availableStreams.length} Stream(s) Available
                </span>
                {selectedStream && (
                  <span className="text-zinc-400 text-sm">
                    - Currently: {parseStreamInfo(selectedStream).source}
                  </span>
                )}
              </div>
              <ChevronDown className={`w-5 h-5 text-zinc-400 transition-transform ${isStreamListExpanded ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {isStreamListExpanded && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-2 space-y-2"
                >
                  {availableStreams.map((stream, index) => {
                    const streamInfo = parseStreamInfo(stream);
                    const isSelected = selectedStream?.url === stream.url;
                    const isTorrent = streamInfo.isTorrent;

                    const handleClick = () => {
                      if (isTorrent && stream.url) {
                        // Copy magnet link to clipboard
                        navigator.clipboard.writeText(stream.url);
                        toast.success('Magnet link copied to clipboard!');
                      } else {
                        handleStreamSelect(stream);
                      }
                    };

                    return (
                      <button
                        key={index}
                        onClick={handleClick}
                        className={`w-full flex items-center justify-between p-4 rounded-lg transition-all ${
                          isTorrent
                            ? 'bg-purple-900/30 text-purple-200 hover:bg-purple-900/50 border border-purple-700/50'
                            : isSelected
                            ? 'bg-red-600 text-white'
                            : 'bg-zinc-900 text-zinc-300 hover:bg-zinc-800'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {isTorrent ? (
                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M12 2L2 7v10c0 5.5 3.8 9.7 10 11 6.2-1.3 10-5.5 10-11V7l-10-5zm0 18c-4.4-1-7-4.2-7-8V8.3l7-3.5 7 3.5V12c0 3.8-2.6 7-7 8z"/>
                            </svg>
                          ) : isSelected ? (
                            <Check className="w-5 h-5" />
                          ) : (
                            <Play className="w-5 h-5 text-zinc-600" />
                          )}
                          <div className="text-left">
                            <div className="font-medium">{streamInfo.source}</div>
                            <div className="text-xs opacity-75">
                              {stream.name || stream.title || 'Stream'}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {streamInfo.size && (
                            <span className="text-xs opacity-75">{streamInfo.size}</span>
                          )}
                          {isTorrent && (
                            <span className="px-3 py-1 rounded-full text-xs font-medium bg-purple-700/50">
                              TORRENT
                            </span>
                          )}
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                            isTorrent ? 'bg-purple-700/50' :
                            isSelected ? 'bg-white/20' : 'bg-zinc-800'
                          }`}>
                            {streamInfo.quality}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Content Info */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-white">
                  {details.title || details.name}
                </h1>
                {type === 'tv' && currentEpisode && (
                  <p className="text-lg text-zinc-300 mt-1">
                    S{selectedSeason}:E{selectedEpisode} - {currentEpisode.name}
                  </p>
                )}
              </div>

              <button
                onClick={handleWatchlistToggle}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  inWatchlist ? 'bg-white text-black' : 'bg-zinc-800 text-white hover:bg-zinc-700'
                }`}
              >
                {inWatchlist ? <><Check className="w-5 h-5" /> In My List</> : <><Plus className="w-5 h-5" /> Add to List</>}
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-4 mb-6 text-sm text-zinc-400">
              <span className="flex items-center gap-1">
                <Star className="w-4 h-4 text-yellow-500" />
                {details.vote_average?.toFixed(1)}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {(details.release_date || details.first_air_date || '').split('-')[0]}
              </span>
              {details.runtime && (
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {Math.floor(details.runtime / 60)}h {details.runtime % 60}m
                </span>
              )}
              {details.number_of_seasons && <span>{details.number_of_seasons} Seasons</span>}
            </div>

            <p className="text-zinc-300 leading-relaxed mb-8">
              {currentEpisode?.overview || details.overview}
            </p>

            {trailer && (
              <div className="mb-8">
                <h2 className="text-lg font-semibold text-white mb-3">Trailer</h2>
                <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-zinc-800 bg-zinc-900">
                  <iframe
                    title={trailer.name || 'Trailer'}
                    src={`https://www.youtube.com/embed/${trailer.key}?rel=0&modestbranding=1`}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="absolute inset-0 h-full w-full"
                  />
                </div>
                {trailer.name && (
                  <p className="text-xs text-zinc-500 mt-2">{trailer.name}</p>
                )}
              </div>
            )}

            {details.genres && (
              <div className="flex flex-wrap gap-2 mb-8">
                {details.genres.map((genre: any) => (
                  <Link
                    key={genre.id}
                    href={`/discover/${type}/${genre.id}`}
                    className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 rounded-full text-sm text-zinc-300 transition-colors"
                  >
                    {genre.name}
                  </Link>
                ))}
              </div>
            )}

            {/* Episode List for TV */}
            {type === 'tv' && details.seasons && (
              <div className="mb-8">
                <h2 className="text-xl font-bold text-white mb-4">Episodes</h2>

                <div className="mb-4">
                  <button
                    onClick={() => setIsSeasonExpanded(!isSeasonExpanded)}
                    className="flex items-center gap-2 px-4 py-3 bg-zinc-800 rounded-lg w-full md:w-auto"
                  >
                    <span className="text-white font-medium">Season {selectedSeason}</span>
                    <ChevronDown className={`w-5 h-5 text-zinc-400 transition-transform ${isSeasonExpanded ? 'rotate-180' : ''}`} />
                  </button>

                  <AnimatePresence>
                    {isSeasonExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="flex flex-wrap gap-2 mt-3"
                      >
                        {details.seasons
                          .filter((s: Season) => s.season_number > 0)
                          .map((season: Season) => (
                            <button
                              key={season.id}
                              onClick={() => {
                                setSelectedSeason(season.season_number);
                                setSelectedEpisode(1);
                              }}
                              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                selectedSeason === season.season_number
                                  ? 'bg-red-600 text-white'
                                  : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                              }`}
                            >
                              S{season.season_number}
                            </button>
                          ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="space-y-3">
                  {seasonDetails?.episodes?.map((episode: Episode) => {
                    const status = getEpisodeStatus(selectedSeason, episode.episode_number);
                    const progress = getEpisodeProgress(contentId, selectedSeason, episode.episode_number);

                    return (
                      <motion.button
                        key={episode.id}
                        onClick={() => handleEpisodeClick(selectedSeason, episode.episode_number)}
                        className={`w-full flex gap-4 p-3 rounded-lg transition-all ${
                          status === 'current'
                            ? 'bg-zinc-800 ring-2 ring-red-500'
                            : status === 'watched'
                            ? 'bg-zinc-900/50 hover:bg-zinc-800'
                            : 'bg-zinc-900 hover:bg-zinc-800'
                        }`}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                      >
                        <div className="relative flex-none w-40 aspect-video rounded overflow-hidden bg-zinc-800">
                          {episode.still_path ? (
                            <Image
                              src={`https://image.tmdb.org/t/p/w300${episode.still_path}`}
                              alt={episode.name}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Play className="w-8 h-8 text-zinc-600" />
                            </div>
                          )}

                          {status === 'in-progress' && progress > 0 && (
                            <div className="absolute bottom-0 left-0 right-0 h-1 bg-zinc-700">
                              <div className="h-full bg-red-600" style={{ width: `${progress}%` }} />
                            </div>
                          )}

                          {status === 'watched' && (
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                              <Check className="w-8 h-8 text-green-500" />
                            </div>
                          )}

                          {status === 'current' && (
                            <div className="absolute top-2 left-2 px-2 py-1 bg-red-600 rounded text-xs font-bold text-white">
                              NOW
                            </div>
                          )}
                        </div>

                        <div className="flex-1 text-left">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-zinc-400">E{episode.episode_number}</span>
                            <h4 className="text-white font-medium line-clamp-1">{episode.name}</h4>
                          </div>
                          <p className="text-sm text-zinc-400 line-clamp-2 mt-1">
                            {episode.overview || 'No description available.'}
                          </p>
                          <div className="flex items-center gap-3 mt-2 text-xs text-zinc-500">
                            {episode.runtime && <span>{episode.runtime}m</span>}
                            {episode.air_date && <span>{episode.air_date}</span>}
                          </div>
                        </div>

                        <ChevronRight className="flex-none w-5 h-5 text-zinc-600" />
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-1">
            <div className="mb-8 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
              <h2 className="text-lg font-semibold text-white mb-4">Recommended Players</h2>
              <div className="space-y-3">
                {[
                  {
                    name: 'VLC',
                    description: 'Best all-around choice, Android + iOS',
                    ios: 'https://apps.apple.com/app/vlc-for-mobile/id650377962',
                    android: 'https://play.google.com/store/apps/details?id=org.videolan.vlc',
                  },
                  {
                    name: 'Infuse',
                    description: 'Premium iOS / iPadOS experience',
                    ios: 'https://apps.apple.com/app/infuse-video-player/id1136220934',
                  },
                  {
                    name: 'Just Player',
                    description: 'Lightweight, fast player on Android',
                    android: 'https://play.google.com/store/apps/details?id=com.brouken.player',
                  },
                ].map((player) => (
                  <div key={player.name} className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-3">
                    <p className="text-white font-medium">{player.name}</p>
                    <p className="text-xs text-zinc-400 mb-2">{player.description}</p>
                    <div className="flex flex-wrap gap-2 text-xs">
                      {player.android && (
                        <a
                          href={player.android}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 rounded-full border border-zinc-700 px-3 py-1 text-zinc-300 hover:border-red-500/60 hover:text-white"
                        >
                          Google Play
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                      {player.ios && (
                        <a
                          href={player.ios}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 rounded-full border border-zinc-700 px-3 py-1 text-zinc-300 hover:border-red-500/60 hover:text-white"
                        >
                          App Store
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <h2 className="text-xl font-bold text-white mb-4">More Like This</h2>
            <div className="grid grid-cols-2 lg:grid-cols-1 gap-4">
              {recommendations?.slice(0, 6).map((item: any) => (
                <MediaCard
                  key={item.id}
                  id={String(item.id)}
                  title={item.title || item.name}
                  poster={item.poster_path}
                  backdrop={item.backdrop_path}
                  type={type}
                  rating={item.vote_average}
                  year={(item.release_date || item.first_air_date || '').split('-')[0]}
                  variant="default"
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
