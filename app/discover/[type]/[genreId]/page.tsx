'use client';

import { useParams } from 'next/navigation';
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import axios from 'axios';
import { motion } from 'framer-motion';
import { ChevronLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useCallback } from 'react';

import { MediaCard, MediaCardSkeleton } from '@/components/ui/media-card';

const TMDB_API_KEY = 'ffe7ef8916c61835264d2df68276ddc2';
const TMDB_BASE = 'https://api.themoviedb.org/3';

async function fetchByGenrePage(type: string, genreId: string, page: number) {
  const { data } = await axios.get(
    `${TMDB_BASE}/discover/${type}?api_key=${TMDB_API_KEY}&with_genres=${genreId}&sort_by=popularity.desc&page=${page}`
  );
  return {
    results: data.results,
    page: data.page,
    totalPages: data.total_pages,
  };
}

async function fetchGenres(type: string) {
  const { data } = await axios.get(
    `${TMDB_BASE}/genre/${type}/list?api_key=${TMDB_API_KEY}`
  );
  return data.genres;
}

export default function DiscoverPage() {
  const params = useParams();
  const type = (params.type as string) || 'movie';
  const genreId = params.genreId as string;
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const { data: genres } = useQuery({
    queryKey: ['genres', type],
    queryFn: () => fetchGenres(type),
    staleTime: 1000 * 60 * 60, // 1 hour
  });

  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useInfiniteQuery({
    queryKey: ['discover', type, genreId],
    queryFn: ({ pageParam = 1 }) => fetchByGenrePage(type, genreId, pageParam),
    getNextPageParam: (lastPage) => {
      if (lastPage.page < lastPage.totalPages) {
        return lastPage.page + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
    enabled: !!type && !!genreId,
    staleTime: 1000 * 60 * 5,
  });

  // Infinite scroll observer
  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [target] = entries;
      if (target.isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    },
    [fetchNextPage, hasNextPage, isFetchingNextPage]
  );

  useEffect(() => {
    const element = loadMoreRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(handleObserver, {
      root: null,
      rootMargin: '200px',
      threshold: 0,
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, [handleObserver]);

  const genreName = genres?.find((g: any) => String(g.id) === genreId)?.name || 'Discover';
  const title = `${genreName} ${type === 'movie' ? 'Movies' : 'Series'}`;

  // Flatten all pages into a single array
  const allResults = data?.pages.flatMap((page) => page.results) ?? [];

  return (
    <main className="min-h-screen bg-zinc-950 pt-24 pb-24">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link
            href={type === 'movie' ? '/movies' : '/series'}
            className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-full transition-colors"
          >
            <ChevronLeft className="w-6 h-6 text-white" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-white capitalize">
              {title}
            </h1>
            <p className="text-zinc-400">
              Browse the best {genreName.toLowerCase()} {type === 'movie' ? 'movies' : 'TV shows'}
            </p>
          </div>
        </div>

        {/* Results Grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {Array.from({ length: 18 }).map((_, i) => (
              <MediaCardSkeleton key={i} />
            ))}
          </div>
        ) : allResults.length > 0 ? (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {allResults.map((item: any, index: number) => (
                <motion.div
                  key={`${item.id}-${index}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(index * 0.02, 0.3) }}
                >
                  <MediaCard
                    id={String(item.id)}
                    title={item.title || item.name}
                    poster={item.poster_path || ''}
                    backdrop={item.backdrop_path}
                    type={type as 'movie' | 'tv'}
                    rating={item.vote_average}
                    year={(item.release_date || item.first_air_date || '').split('-')[0]}
                  />
                </motion.div>
              ))}
            </div>

            {/* Load more trigger */}
            <div ref={loadMoreRef} className="flex justify-center py-8">
              {isFetchingNextPage && (
                <div className="flex items-center gap-3 text-zinc-400">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Loading more...</span>
                </div>
              )}
              {!hasNextPage && allResults.length > 20 && (
                <p className="text-zinc-500 text-sm">You've reached the end</p>
              )}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <h2 className="text-xl font-semibold text-white mb-2">No results found</h2>
            <p className="text-zinc-400">
              We couldn't find any {type === 'movie' ? 'movies' : 'series'} in this category.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
