'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { motion } from 'framer-motion';
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';

import { MediaCard, MediaCardSkeleton } from '@/components/ui/media-card';

const TMDB_API_KEY = 'ffe7ef8916c61835264d2df68276ddc2';
const TMDB_BASE = 'https://api.themoviedb.org/3';

async function fetchByGenre(type: string, genreId: string) {
  const { data } = await axios.get(
    `${TMDB_BASE}/discover/${type}?api_key=${TMDB_API_KEY}&with_genres=${genreId}&sort_by=popularity.desc`
  );
  return data.results;
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

  const { data: genres } = useQuery({
    queryKey: ['genres', type],
    queryFn: () => fetchGenres(type),
    staleTime: 1000 * 60 * 60, // 1 hour
  });

  const { data: results, isLoading } = useQuery({
    queryKey: ['discover', type, genreId],
    queryFn: () => fetchByGenre(type, genreId),
    enabled: !!type && !!genreId,
    staleTime: 1000 * 60 * 5,
  });

  const genreName = genres?.find((g: any) => String(g.id) === genreId)?.name || 'Discover';
  const title = `${genreName} ${type === 'movie' ? 'Movies' : 'Series'}`;

  return (
    <main className="min-h-screen bg-zinc-950 pt-24 pb-12">
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
            {Array.from({ length: 12 }).map((_, i) => (
              <MediaCardSkeleton key={i} />
            ))}
          </div>
        ) : results && results.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {results.map((item: any, index: number) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
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
