'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, X, Film, Tv, Filter } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

import { MediaCard, MediaCardSkeleton } from '@/components/ui/media-card';

const TMDB_API_KEY = 'ffe7ef8916c61835264d2df68276ddc2';
const TMDB_BASE = 'https://api.themoviedb.org/3';

async function searchMedia(query: string, page: number = 1) {
  if (!query.trim()) return { results: [], total_pages: 0 };

  const { data } = await axios.get(
    `${TMDB_BASE}/search/multi?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(
      query
    )}&page=${page}&include_adult=false`
  );

  // Filter out people
  return {
    ...data,
    results: data.results.filter(
      (item: any) => item.media_type === 'movie' || item.media_type === 'tv'
    ),
  };
}

async function fetchTrending() {
  const { data } = await axios.get(
    `${TMDB_BASE}/trending/all/day?api_key=${TMDB_API_KEY}`
  );
  return data.results.filter(
    (item: any) => item.media_type === 'movie' || item.media_type === 'tv'
  );
}

type FilterType = 'all' | 'movie' | 'tv';

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 400);

    return () => clearTimeout(timer);
  }, [query]);

  // Search query
  const {
    data: searchResults,
    isLoading: searchLoading,
    isFetching: searchFetching,
  } = useQuery({
    queryKey: ['search', debouncedQuery],
    queryFn: () => searchMedia(debouncedQuery),
    enabled: debouncedQuery.length > 0,
    staleTime: 1000 * 60 * 2,
  });

  // Trending for empty state
  const { data: trending, isLoading: trendingLoading } = useQuery({
    queryKey: ['trending-search'],
    queryFn: fetchTrending,
    staleTime: 1000 * 60 * 5,
  });

  // Filter results
  const filteredResults = searchResults?.results?.filter((item: any) => {
    if (filter === 'all') return true;
    return item.media_type === filter;
  });

  const showResults = debouncedQuery.length > 0;
  const results = showResults ? filteredResults : trending;
  const isLoading = showResults ? searchLoading : trendingLoading;

  const clearSearch = () => {
    setQuery('');
    setDebouncedQuery('');
  };

  return (
    <main className="min-h-screen bg-zinc-950 pt-20 pb-24">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        {/* Search Header */}
        <div className="sticky top-16 z-20 bg-zinc-950/95 backdrop-blur-sm py-4">
          {/* Search Input */}
          <div className="relative mb-4">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
            <input
              type="text"
              placeholder="Search movies, series, anime..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-12 pr-12 py-4 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-400 focus:outline-none focus:border-red-500 transition-colors"
              autoFocus
            />
            <AnimatePresence>
              {query && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  onClick={clearSearch}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-full bg-zinc-700 hover:bg-zinc-600 transition-colors"
                >
                  <X className="w-4 h-4 text-white" />
                </motion.button>
              )}
            </AnimatePresence>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-white text-black'
                  : 'bg-zinc-800 text-white hover:bg-zinc-700'
              }`}
            >
              <Filter className="w-4 h-4" />
              All
            </button>
            <button
              onClick={() => setFilter('movie')}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                filter === 'movie'
                  ? 'bg-white text-black'
                  : 'bg-zinc-800 text-white hover:bg-zinc-700'
              }`}
            >
              <Film className="w-4 h-4" />
              Movies
            </button>
            <button
              onClick={() => setFilter('tv')}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                filter === 'tv'
                  ? 'bg-white text-black'
                  : 'bg-zinc-800 text-white hover:bg-zinc-700'
              }`}
            >
              <Tv className="w-4 h-4" />
              Series
            </button>
          </div>
        </div>

        {/* Results Header */}
        <div className="flex items-center justify-between mb-6 mt-4">
          <h2 className="text-xl font-semibold text-white">
            {showResults
              ? `Results for "${debouncedQuery}"`
              : 'Trending Now'}
          </h2>
          {searchResults?.results && (
            <span className="text-sm text-zinc-400">
              {filteredResults?.length || 0} results
            </span>
          )}
        </div>

        {/* Results Grid */}
        <AnimatePresence mode="wait">
          {isLoading || searchFetching ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4"
            >
              {Array.from({ length: 12 }).map((_, i) => (
                <MediaCardSkeleton key={i} />
              ))}
            </motion.div>
          ) : results && results.length > 0 ? (
            <motion.div
              key="results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4"
            >
              {results.map((item: any, index: number) => (
                <motion.div
                  key={`${item.id}-${index}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <MediaCard
                    id={String(item.id)}
                    title={item.title || item.name}
                    poster={item.poster_path || ''}
                    backdrop={item.backdrop_path}
                    type={item.media_type || 'movie'}
                    rating={item.vote_average}
                    year={(item.release_date || item.first_air_date || '').split('-')[0]}
                  />
                </motion.div>
              ))}
            </motion.div>
          ) : showResults ? (
            <motion.div
              key="no-results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-20"
            >
              <Search className="w-16 h-16 text-zinc-700 mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">
                No results found
              </h3>
              <p className="text-zinc-400 text-center">
                Try searching for something else or check your spelling.
              </p>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </main>
  );
}
