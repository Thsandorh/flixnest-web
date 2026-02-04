'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Play, Info, Plus, Check } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

import { InfiniteMediaRow } from '@/components/ui/infinite-media-row';
import { useWatchlistStore } from '@/store';

const TMDB_API_KEY = 'ffe7ef8916c61835264d2df68276ddc2';
const TMDB_BASE = 'https://api.themoviedb.org/3';

async function fetchMovies(category: string) {
  const { data } = await axios.get(
    `${TMDB_BASE}/movie/${category}?api_key=${TMDB_API_KEY}`
  );
  return data.results;
}

async function fetchByGenre(genreId: number) {
  const { data } = await axios.get(
    `${TMDB_BASE}/discover/movie?api_key=${TMDB_API_KEY}&with_genres=${genreId}&sort_by=popularity.desc`
  );
  return data.results;
}

export default function MoviesPage() {
  const { isInWatchlist, toggleWatchlist } = useWatchlistStore();

  const { data: popular, isLoading: popularLoading } = useQuery({
    queryKey: ['movies', 'popular'],
    queryFn: () => fetchMovies('popular'),
    staleTime: 1000 * 60 * 5,
  });

  const { data: topRated, isLoading: topRatedLoading } = useQuery({
    queryKey: ['movies', 'top_rated'],
    queryFn: () => fetchMovies('top_rated'),
    staleTime: 1000 * 60 * 5,
  });

  const { data: nowPlaying, isLoading: nowPlayingLoading } = useQuery({
    queryKey: ['movies', 'now_playing'],
    queryFn: () => fetchMovies('now_playing'),
    staleTime: 1000 * 60 * 5,
  });

  const { data: upcoming, isLoading: upcomingLoading } = useQuery({
    queryKey: ['movies', 'upcoming'],
    queryFn: () => fetchMovies('upcoming'),
    staleTime: 1000 * 60 * 5,
  });

  const { data: action, isLoading: actionLoading } = useQuery({
    queryKey: ['movies', 'action'],
    queryFn: () => fetchByGenre(28),
    staleTime: 1000 * 60 * 5,
  });

  const { data: comedy, isLoading: comedyLoading } = useQuery({
    queryKey: ['movies', 'comedy'],
    queryFn: () => fetchByGenre(35),
    staleTime: 1000 * 60 * 5,
  });

  const { data: horror, isLoading: horrorLoading } = useQuery({
    queryKey: ['movies', 'horror'],
    queryFn: () => fetchByGenre(27),
    staleTime: 1000 * 60 * 5,
  });

  const { data: sciFi, isLoading: sciFiLoading } = useQuery({
    queryKey: ['movies', 'scifi'],
    queryFn: () => fetchByGenre(878),
    staleTime: 1000 * 60 * 5,
  });

  const { data: thriller, isLoading: thrillerLoading } = useQuery({
    queryKey: ['movies', 'thriller'],
    queryFn: () => fetchByGenre(53),
    staleTime: 1000 * 60 * 5,
  });

  const { data: romance, isLoading: romanceLoading } = useQuery({
    queryKey: ['movies', 'romance'],
    queryFn: () => fetchByGenre(10749),
    staleTime: 1000 * 60 * 5,
  });

  const heroItem = popular?.[0];
  const heroInWatchlist = heroItem ? isInWatchlist(String(heroItem.id)) : false;

  const handleHeroWatchlist = () => {
    if (heroItem) {
      toggleWatchlist({
        id: String(heroItem.id),
        type: 'movie',
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
          <div className="absolute inset-0">
            <Image
              src={`https://image.tmdb.org/t/p/original${heroItem.backdrop_path}`}
              alt={heroItem.title || heroItem.name}
              fill
              priority
              unoptimized
              className="object-cover"
            />
            <div className="absolute inset-0 gradient-overlay" />
            <div className="absolute inset-0 gradient-overlay-right" />
          </div>

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
                href={`/watch/movie/${heroItem.id}`}
                className="flex items-center gap-2 px-6 py-3 bg-white text-black font-semibold rounded-lg hover:bg-zinc-200 transition-colors"
              >
                <Play className="w-5 h-5" fill="black" />
                Play
              </Link>

              <Link
                href={`/watch/movie/${heroItem.id}`}
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

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="flex items-center gap-3 mt-4"
            >
              <span className="px-2 py-1 text-sm font-bold bg-red-600 text-white rounded">
                MOVIE
              </span>
              <span className="text-sm text-zinc-300">
                {heroItem.vote_average?.toFixed(1)} Rating
              </span>
              <span className="text-sm text-zinc-300">
                {(heroItem.release_date || '').split('-')[0]}
              </span>
            </motion.div>
          </div>
        </section>
      )}

      {/* Content Rows */}
      <div className="relative z-10 -mt-32 pb-24">
        <InfiniteMediaRow
          title="Popular Movies"
          items={popular?.slice(1)}
          isLoading={popularLoading}
          defaultType="movie"
        />

        <InfiniteMediaRow
          title="Now Playing"
          items={nowPlaying}
          isLoading={nowPlayingLoading}
          defaultType="movie"
        />

        <InfiniteMediaRow
          title="Top Rated Movies"
          items={topRated}
          isLoading={topRatedLoading}
          defaultType="movie"
        />

        <InfiniteMediaRow
          title="Upcoming Movies"
          items={upcoming}
          isLoading={upcomingLoading}
          defaultType="movie"
        />

        <InfiniteMediaRow
          title="Action & Adventure"
          items={action}
          isLoading={actionLoading}
          defaultType="movie"
        />

        <InfiniteMediaRow
          title="Comedy"
          items={comedy}
          isLoading={comedyLoading}
          defaultType="movie"
        />

        <InfiniteMediaRow
          title="Horror"
          items={horror}
          isLoading={horrorLoading}
          defaultType="movie"
        />

        <InfiniteMediaRow
          title="Sci-Fi & Fantasy"
          items={sciFi}
          isLoading={sciFiLoading}
          defaultType="movie"
        />

        <InfiniteMediaRow
          title="Thriller"
          items={thriller}
          isLoading={thrillerLoading}
          defaultType="movie"
        />

        <InfiniteMediaRow
          title="Romance"
          items={romance}
          isLoading={romanceLoading}
          defaultType="movie"
        />
      </div>
    </main>
  );
}
