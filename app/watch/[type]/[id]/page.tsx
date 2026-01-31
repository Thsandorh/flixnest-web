'use client';

import { useState, useEffect, useMemo } from 'react';
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
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'sonner';

import { VideoPlayer } from '@/components/player/video-player';
import { MediaCard } from '@/components/ui/media-card';
import {
  useHistoryStore,
  useWatchlistStore,
  useAddonStore,
} from '@/store';
import { getStreams, getSubtitles, parseStreamInfo, type Stream } from '@/lib/stremio';

const TMDB_API_KEY = 'ffe7ef8916c61835264d2df68276ddc2';
const TMDB_BASE = 'https://api.themoviedb.org/3';

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

export default function WatchPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const type = params.type as 'movie' | 'tv';
  const tmdbId = params.id as string;

  const seasonParam = searchParams.get('season');
  const episodeParam = searchParams.get('episode');

  const [selectedSeason, setSelectedSeason] = useState(
    seasonParam ? parseInt(seasonParam) : 1
  );
  const [selectedEpisode, setSelectedEpisode] = useState(
    episodeParam ? parseInt(episodeParam) : 1
  );
  const [availableStreams, setAvailableStreams] = useState<Stream[]>([]);
  const [selectedStream, setSelectedStream] = useState<Stream | null>(null);
  const [subtitles, setSubtitles] = useState<Array<{ src: string; label: string; srclang: string }>>([]);
  const [isLoadingStream, setIsLoadingStream] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [isSeasonExpanded, setIsSeasonExpanded] = useState(true);
  const [isStreamListExpanded, setIsStreamListExpanded] = useState(false);

  const { activeAddons } = useAddonStore();
  const { isInWatchlist, toggleWatchlist } = useWatchlistStore();
  const { updateProgress, markEpisodeWatched, isEpisodeWatched, getEpisodeProgress } = useHistoryStore();

  // Fetch media details
  const { data: details, isLoading: detailsLoading } = useQuery({
    queryKey: ['details', type, tmdbId],
    queryFn: async () => {
      const { data } = await axios.get(
        `${TMDB_BASE}/${type}/${tmdbId}?api_key=${TMDB_API_KEY}&append_to_response=external_ids,credits`
      );
      return data;
    },
  });

  // Fetch season details for TV
  const { data: seasonDetails } = useQuery({
    queryKey: ['season', tmdbId, selectedSeason],
    queryFn: async () => {
      const { data } = await axios.get(
        `${TMDB_BASE}/tv/${tmdbId}/season/${selectedSeason}?api_key=${TMDB_API_KEY}`
      );
      return data;
    },
    enabled: type === 'tv',
  });

  // Fetch recommendations
  const { data: recommendations } = useQuery({
    queryKey: ['recommendations', type, tmdbId],
    queryFn: async () => {
      const { data } = await axios.get(
        `${TMDB_BASE}/${type}/${tmdbId}/recommendations?api_key=${TMDB_API_KEY}`
      );
      return data.results?.slice(0, 12);
    },
  });

  const imdbId = details?.external_ids?.imdb_id || details?.imdb_id;

  // Fetch streams from ALL active addons
  useEffect(() => {
    if (!imdbId || activeAddons.length === 0) return;

    const fetchAllStreams = async () => {
      setIsLoadingStream(true);
      setStreamError(null);

      try {
        const stremioType = type === 'tv' ? 'series' : 'movie';

        // Fetch from all active addons in parallel
        const streamPromises = activeAddons.map(addon =>
          getStreams(
            addon.manifest,
            stremioType,
            imdbId,
            type === 'tv' ? selectedSeason : undefined,
            type === 'tv' ? selectedEpisode : undefined
          ).catch(() => [] as Stream[])
        );

        const results = await Promise.all(streamPromises);
        const allStreams = results.flat();

        // Remove duplicates by URL
        const uniqueStreams = allStreams.filter((stream, index, self) =>
          stream.url && self.findIndex(s => s.url === stream.url) === index
        );

        if (uniqueStreams.length > 0) {
          setAvailableStreams(uniqueStreams);

          // Auto-select first stream
          const firstStream = uniqueStreams[0];
          if (firstStream?.url) {
            console.log('[Watch] Auto-selecting stream:', firstStream.name || firstStream.title);
            setSelectedStream(firstStream);
            const info = parseStreamInfo(firstStream);
            toast.success(`Found ${uniqueStreams.length} stream(s) - Playing ${info.source}`);
          }
        } else {
          setAvailableStreams([]);
          setSelectedStream(null);
          setStreamError('No streams found. Try different addons.');
        }

        // Fetch subtitles
        const subs = await getSubtitles(
          imdbId,
          stremioType,
          type === 'tv' ? selectedSeason : undefined,
          type === 'tv' ? selectedEpisode : undefined
        );

        setSubtitles(
          subs.slice(0, 10).map((sub) => ({
            src: sub.url,
            label: sub.lang,
            srclang: sub.lang.toLowerCase().slice(0, 2),
          }))
        );
      } catch (error) {
        console.error('Stream fetch error:', error);
        setStreamError('Failed to fetch streams. Please try again.');
      } finally {
        setIsLoadingStream(false);
      }
    };

    fetchAllStreams();
  }, [imdbId, activeAddons, type, selectedSeason, selectedEpisode]);

  // Update URL when episode changes
  useEffect(() => {
    if (type === 'tv') {
      const newUrl = `/watch/tv/${tmdbId}?season=${selectedSeason}&episode=${selectedEpisode}`;
      router.replace(newUrl, { scroll: false });
    }
  }, [selectedSeason, selectedEpisode, tmdbId, type, router]);

  const currentEpisode = seasonDetails?.episodes?.find(
    (ep: Episode) => ep.episode_number === selectedEpisode
  );

  const getEpisodeStatus = (season: number, episode: number) => {
    const watched = isEpisodeWatched(tmdbId, season, episode);
    const progress = getEpisodeProgress(tmdbId, season, episode);
    const isCurrent = season === selectedSeason && episode === selectedEpisode;

    if (isCurrent) return 'current';
    if (watched) return 'watched';
    if (progress > 0) return 'in-progress';
    return 'unwatched';
  };

  const nextEpisode = useMemo(() => {
    if (type !== 'tv' || !seasonDetails?.episodes) return null;

    const totalEpisodes = seasonDetails.episodes.length;
    const totalSeasons = details?.number_of_seasons || 1;

    if (selectedEpisode < totalEpisodes) {
      return { season: selectedSeason, episode: selectedEpisode + 1 };
    } else if (selectedSeason < totalSeasons) {
      return { season: selectedSeason + 1, episode: 1 };
    }
    return null;
  }, [selectedSeason, selectedEpisode, seasonDetails, details, type]);

  const handleProgressUpdate = (currentTime: number, duration: number) => {
    if (!details) return;

    updateProgress({
      id: tmdbId,
      imdbId: imdbId,
      type: type,
      title: details.title || details.name,
      poster: details.poster_path,
      backdrop: details.backdrop_path,
      season: type === 'tv' ? selectedSeason : undefined,
      episode: type === 'tv' ? selectedEpisode : undefined,
      episodeTitle: currentEpisode?.name,
      progress: currentTime,
      duration: duration,
    });
  };

  const handleEnded = () => {
    if (type === 'tv') {
      markEpisodeWatched(tmdbId, selectedSeason, selectedEpisode);
      toast.success('Episode marked as watched');

      if (nextEpisode) {
        toast.info(`Playing next episode: S${nextEpisode.season}:E${nextEpisode.episode}`);
        setSelectedSeason(nextEpisode.season);
        setSelectedEpisode(nextEpisode.episode);
      }
    } else {
      toast.success('Movie marked as watched');
    }
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
    toast.success(`Playing ${info.source} - ${info.quality}`);
    setIsStreamListExpanded(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const inWatchlist = isInWatchlist(tmdbId);

  const handleWatchlistToggle = () => {
    if (!details) return;
    toggleWatchlist({
      id: tmdbId,
      type: type,
      title: details.title || details.name,
      poster: details.poster_path,
      backdrop: details.backdrop_path,
    });
    toast.success(inWatchlist ? 'Removed from list' : 'Added to list');
  };

  if (detailsLoading) {
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
        {/* Video Player */}
        <div className="mb-6">
          {isLoadingStream ? (
            <div className="aspect-video bg-zinc-900 rounded-xl flex items-center justify-center">
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="w-12 h-12 text-red-500 animate-spin" />
                <p className="text-zinc-400">Searching {activeAddons.length} addon(s)...</p>
              </div>
            </div>
          ) : streamError ? (
            <div className="aspect-video bg-zinc-900 rounded-xl flex items-center justify-center">
              <div className="flex flex-col items-center gap-4 text-center px-4">
                <AlertCircle className="w-12 h-12 text-red-500" />
                <p className="text-white font-semibold">{streamError}</p>
              </div>
            </div>
          ) : selectedStream?.url ? (
            <VideoPlayer
              src={selectedStream.url}
              headers={selectedStream.headers}
              poster={`https://image.tmdb.org/t/p/w1280${details.backdrop_path}`}
              title={
                type === 'tv'
                  ? `${details.name} - S${selectedSeason}:E${selectedEpisode}`
                  : details.title
              }
              subtitles={subtitles}
              onProgress={handleProgressUpdate}
              onEnded={handleEnded}
            />
          ) : (
            <div className="aspect-video bg-zinc-900 rounded-xl flex items-center justify-center">
              <p className="text-zinc-400">No streams available</p>
            </div>
          )}
        </div>

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

                    return (
                      <button
                        key={index}
                        onClick={() => handleStreamSelect(stream)}
                        className={`w-full flex items-center justify-between p-4 rounded-lg transition-all ${
                          isSelected
                            ? 'bg-red-600 text-white'
                            : 'bg-zinc-900 text-zinc-300 hover:bg-zinc-800'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {isSelected ? (
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
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
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

            {details.genres && (
              <div className="flex flex-wrap gap-2 mb-8">
                {details.genres.map((genre: any) => (
                  <span key={genre.id} className="px-3 py-1 bg-zinc-800 rounded-full text-sm text-zinc-300">
                    {genre.name}
                  </span>
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
                    const progress = getEpisodeProgress(tmdbId, selectedSeason, episode.episode_number);

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
