'use client';

import { useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Play, Info, Plus, Check } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

import { InfiniteMediaRow } from '@/components/ui/infinite-media-row';
import { useAddonStore, useHistoryStore, useWatchlistStore } from '@/store';
import { getCatalogItems, getManifest, type MetaPreview } from '@/lib/stremio';

const TMDB_API_KEY = 'ffe7ef8916c61835264d2df68276ddc2';
const TMDB_BASE = 'https://api.themoviedb.org/3';
const ADDON_CACHE_KEY = 'flixnest-addon-catalogs';
const ADDON_CACHE_TTL = 1000 * 60 * 60;

// Fetch functions
async function fetchTrending() {
  const { data } = await axios.get(
    `${TMDB_BASE}/trending/all/week?api_key=${TMDB_API_KEY}`
  );
  return data.results;
}

async function fetchMovies(category: string) {
  const { data } = await axios.get(
    `${TMDB_BASE}/movie/${category}?api_key=${TMDB_API_KEY}`
  );
  return data.results;
}

async function fetchTVShows(category: string) {
  const { data } = await axios.get(
    `${TMDB_BASE}/tv/${category}?api_key=${TMDB_API_KEY}`
  );
  return data.results;
}

async function fetchByGenre(type: 'movie' | 'tv', genreId: number) {
  const { data } = await axios.get(
    `${TMDB_BASE}/discover/${type}?api_key=${TMDB_API_KEY}&with_genres=${genreId}&sort_by=popularity.desc`
  );
  return data.results;
}

async function fetchAnime() {
  const { data } = await axios.get(
    `${TMDB_BASE}/discover/tv?api_key=${TMDB_API_KEY}&with_genres=16&with_original_language=ja&sort_by=popularity.desc`
  );
  return data.results;
}

const ITEMS_PER_CATALOG = 20;

const mapCatalogType = (type: string): 'movie' | 'tv' => {
  if (type === 'series' || type === 'tv' || type === 'channel') return 'tv';
  return 'movie';
};

const extractYear = (releaseInfo?: string): string | undefined => {
  if (!releaseInfo) return undefined;
  const match = releaseInfo.match(/\b(19|20)\d{2}\b/);
  return match ? match[0] : undefined;
};

const mapCatalogMeta = (meta: MetaPreview) => {
  const mediaType = mapCatalogType(meta.type);
  const year = extractYear(meta.releaseInfo);
  const rating = meta.imdbRating ? Number(meta.imdbRating) : undefined;
  return {
    id: meta.imdb_id || meta.imdbId || meta.id,
    title: meta.name,
    poster_path: meta.poster,
    backdrop_path: meta.background,
    media_type: mediaType,
    vote_average: rating && Number.isFinite(rating) ? rating : undefined,
    release_date: mediaType === 'movie' && year ? `${year}-01-01` : undefined,
    first_air_date: mediaType === 'tv' && year ? `${year}-01-01` : undefined,
  };
};

export default function HomePage() {
  const { history } = useHistoryStore();
  const { watchlist, isInWatchlist, toggleWatchlist } = useWatchlistStore();
  const { activeAddons } = useAddonStore();
  const addonKey = activeAddons.map((addon) => addon.manifest).join('|');

  const cachedAddonCatalogs = useMemo(() => {
    if (typeof window === 'undefined' || addonKey.length === 0) return null;
    try {
      const raw = window.localStorage.getItem(ADDON_CACHE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as {
        addonKey: string;
        updatedAt: number;
        data: Array<{
          key: string;
          title: string;
          items: ReturnType<typeof mapCatalogMeta>[];
          defaultType: 'movie' | 'tv';
        }>;
      };

      if (parsed.addonKey !== addonKey) return null;
      if (Date.now() - parsed.updatedAt > ADDON_CACHE_TTL) {
        window.localStorage.removeItem(ADDON_CACHE_KEY);
        return null;
      }
      return parsed;
    } catch {
      window.localStorage.removeItem(ADDON_CACHE_KEY);
      return null;
    }
  }, [addonKey]);

  // Queries
  const { data: trending, isLoading: trendingLoading } = useQuery({
    queryKey: ['trending'],
    queryFn: fetchTrending,
    staleTime: 1000 * 60 * 5,
  });

  const { data: popularMovies, isLoading: moviesLoading } = useQuery({
    queryKey: ['movies', 'popular'],
    queryFn: () => fetchMovies('popular'),
    staleTime: 1000 * 60 * 5,
  });

  const { data: topRatedTV, isLoading: tvLoading } = useQuery({
    queryKey: ['tv', 'top_rated'],
    queryFn: () => fetchTVShows('top_rated'),
    staleTime: 1000 * 60 * 5,
  });

  const { data: anime, isLoading: animeLoading } = useQuery({
    queryKey: ['anime'],
    queryFn: fetchAnime,
    staleTime: 1000 * 60 * 5,
  });

  const { data: actionMovies, isLoading: actionLoading } = useQuery({
    queryKey: ['movies', 'action'],
    queryFn: () => fetchByGenre('movie', 28),
    staleTime: 1000 * 60 * 5,
  });

  const { data: addonCatalogRows, isLoading: addonCatalogsLoading } = useQuery({
    queryKey: ['addon-catalogs', addonKey],
    queryFn: async () => {
      const manifestResults = await Promise.allSettled(
        activeAddons.map(async (addon) => ({
          addon,
          manifest: await getManifest(addon.manifest),
        }))
      );

      const rows: Array<{
        key: string;
        title: string;
        items: ReturnType<typeof mapCatalogMeta>[];
        defaultType: 'movie' | 'tv';
      }> = [];

      for (const result of manifestResults) {
        if (result.status !== 'fulfilled') continue;
        const { addon, manifest } = result.value;
        if (!manifest?.catalogs || manifest.catalogs.length === 0) continue;

        const catalogs = manifest.catalogs;
        for (const catalog of catalogs) {
          const items = await getCatalogItems(addon.manifest, catalog.type, catalog.id);
          if (items.length === 0) continue;

          rows.push({
            key: `${addon.manifest}:${catalog.type}:${catalog.id}`,
            title: `${manifest.name} · ${catalog.name || catalog.id}`,
            items: items.slice(0, ITEMS_PER_CATALOG).map(mapCatalogMeta),
            defaultType: mapCatalogType(catalog.type),
          });
        }
      }

      if (typeof window !== 'undefined') {
        try {
          window.localStorage.setItem(
            ADDON_CACHE_KEY,
            JSON.stringify({
              addonKey,
              updatedAt: Date.now(),
              data: rows,
            })
          );
        } catch {
          // Ignore storage quota errors.
        }
      }

      return rows;
    },
    enabled: activeAddons.length > 0,
    staleTime: ADDON_CACHE_TTL,
    gcTime: ADDON_CACHE_TTL * 6,
    initialData: cachedAddonCatalogs?.data,
    initialDataUpdatedAt: cachedAddonCatalogs?.updatedAt,
  });

  // Hero item (first trending)
  const heroItem = trending?.[0];

  // Continue watching items (from history)
  const continueWatching = history.slice(0, 10).map((item) => ({
    id: item.id,
    title: item.title,
    poster: item.poster,
    backdrop: item.backdrop,
    type: item.type,
    historyItem: item,
  }));

  // My list items
  const myList = watchlist.map((item) => ({
    id: item.id,
    title: item.title,
    poster: item.poster,
    backdrop: item.backdrop,
    type: item.type,
  }));

  const heroInWatchlist = heroItem ? isInWatchlist(String(heroItem.id)) : false;

  const handleHeroWatchlist = () => {
    if (heroItem) {
      toggleWatchlist({
        id: String(heroItem.id),
        type: heroItem.media_type || 'movie',
        title: heroItem.title || heroItem.name,
        poster: heroItem.poster_path,
        backdrop: heroItem.backdrop_path,
      });
    }
  };

  return (
    <main className="min-h-screen bg-zinc-950">
      {/* Hero Section */}
      {heroItem && (
        <section className="relative h-[80vh] md:h-[90vh] w-full">
          {/* Background Image */}
          <div className="absolute inset-0">
            <Image
              src={`https://image.tmdb.org/t/p/original${heroItem.backdrop_path}`}
              alt={heroItem.title || heroItem.name}
              fill
              priority
              unoptimized
              className="object-cover"
            />
            {/* Gradients */}
            <div className="absolute inset-0 gradient-overlay" />
            <div className="absolute inset-0 gradient-overlay-right" />
          </div>

          {/* Hero Content */}
          <div className="absolute bottom-[20%] left-4 md:left-12 z-10 max-w-2xl">
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-4xl md:text-6xl font-bold text-white mb-4"
            >
              {heroItem.title || heroItem.name}
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-sm md:text-lg text-zinc-200 line-clamp-3 mb-6"
            >
              {heroItem.overview}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="flex flex-wrap gap-3"
            >
              <Link
                href={`/watch/${heroItem.media_type || 'movie'}/${heroItem.id}`}
                className="flex items-center gap-2 px-6 py-3 bg-white text-black font-semibold rounded-lg hover:bg-zinc-200 transition-colors"
              >
                <Play className="w-5 h-5" fill="black" />
                Play
              </Link>

              <Link
                href={`/watch/${heroItem.media_type || 'movie'}/${heroItem.id}`}
                className="flex items-center gap-2 px-6 py-3 bg-zinc-700/80 text-white font-semibold rounded-lg hover:bg-zinc-600 transition-colors"
              >
                <Info className="w-5 h-5" />
                More Info
              </Link>

              <button
                onClick={handleHeroWatchlist}
                className="flex items-center justify-center w-12 h-12 bg-zinc-800/80 rounded-full border border-zinc-500 hover:border-white transition-colors"
              >
                {heroInWatchlist ? (
                  <Check className="w-5 h-5 text-white" />
                ) : (
                  <Plus className="w-5 h-5 text-white" />
                )}
              </button>

            </motion.div>

            {/* Rating badge */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="flex items-center gap-3 mt-4"
            >
              <span className="px-2 py-1 text-sm font-bold bg-red-600 text-white rounded">
                {heroItem.media_type === 'tv' ? 'SERIES' : 'MOVIE'}
              </span>
              <span className="text-sm text-zinc-300">
                {heroItem.vote_average?.toFixed(1)} Rating
              </span>
              <span className="text-sm text-zinc-300">
                {(heroItem.release_date || heroItem.first_air_date || '').split('-')[0]}
              </span>
            </motion.div>
          </div>
        </section>
      )}

      {/* Content Rows */}
      <div className="relative z-10 -mt-32 pb-24">
        {/* Continue Watching */}
        {continueWatching.length > 0 && (
          <InfiniteMediaRow
            title="Continue Watching"
            historyItems={continueWatching}
            variant="continue"
          />
        )}

        {/* My List */}
        {myList.length > 0 && (
          <InfiniteMediaRow
            title="My List"
            historyItems={myList}
            variant="default"
          />
        )}

        {/* Trending Now */}
        <InfiniteMediaRow
          title="Trending Now"
          items={trending?.slice(1)}
          isLoading={trendingLoading}
          defaultType="movie"
        />

        {/* Popular Movies */}
        <InfiniteMediaRow
          title="Popular Movies"
          items={popularMovies}
          isLoading={moviesLoading}
          defaultType="movie"
        />

        {/* Top Rated Series */}
        <InfiniteMediaRow
          title="Top Rated Series"
          items={topRatedTV}
          isLoading={tvLoading}
          defaultType="tv"
        />

        {/* Anime */}
        <InfiniteMediaRow
          title="Anime"
          items={anime}
          isLoading={animeLoading}
          defaultType="tv"
        />

        {/* Action Movies */}
        <InfiniteMediaRow
          title="Action & Adventure"
          items={actionMovies}
          isLoading={actionLoading}
          defaultType="movie"
        />

        {/* Addon Catalogs - Always below TMDB categories */}
        {addonCatalogRows?.map((row) => (
          <InfiniteMediaRow
            key={row.key}
            title={row.title}
            items={row.items}
            isLoading={addonCatalogsLoading}
            defaultType={row.defaultType}
          />
        ))}
      </div>
    </main>
  );
}
