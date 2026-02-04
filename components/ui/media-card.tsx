'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Play, Check, Plus, Clock } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useHistoryStore, useWatchlistStore, type HistoryItem } from '@/store';

function cn(...inputs: (string | undefined | null | boolean)[]) {
  return twMerge(clsx(inputs));
}

export interface MediaCardProps {
  id: string;
  title: string;
  poster: string;
  backdrop?: string;
  type: 'movie' | 'tv';
  rating?: number;
  year?: string;
  // For continue watching
  historyItem?: HistoryItem;
  // Display options
  variant?: 'default' | 'wide' | 'continue';
  showOverlay?: boolean;
  className?: string;
}

export function MediaCard({
  id,
  title,
  poster,
  backdrop,
  type,
  rating,
  year,
  historyItem,
  variant = 'default',
  showOverlay = true,
  className,
}: MediaCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [imageError, setImageError] = useState(false);

  const { isInWatchlist, toggleWatchlist } = useWatchlistStore();
  const { getProgressPercentage } = useHistoryStore();

  const inWatchlist = isInWatchlist(id);

  // Calculate progress percentage
  const progress = historyItem ? getProgressPercentage(historyItem) : 0;
  const isWatched = progress >= 90;

  // Build the watch URL
  let watchUrl = `/watch/${type}/${id}`;
  if (historyItem && type === 'tv' && historyItem.season && historyItem.episode) {
    watchUrl += `?season=${historyItem.season}&episode=${historyItem.episode}`;
  }

  // Image URL
  const resolveImageUrl = (path?: string, size: 'w780' | 'w500' = 'w500') => {
    if (!path) return '/placeholder.svg';

    let absoluteUrl = '';

    if (/^https?:\/\//i.test(path)) {
      absoluteUrl = path;
    } else if (path.startsWith('//')) {
      absoluteUrl = `https:${path}`;
    } else {
      absoluteUrl = `https://image.tmdb.org/t/p/${size}${path}`;
    }

    if (!absoluteUrl.startsWith('https://image.tmdb.org/')) {
      return `/api/image?url=${encodeURIComponent(absoluteUrl)}`;
    }

    return absoluteUrl;
  };

  const imageUrl = variant === 'wide' && backdrop
    ? resolveImageUrl(backdrop, 'w780')
    : resolveImageUrl(poster, 'w500');

  const aspectRatio = variant === 'wide' || variant === 'continue' ? 'aspect-video' : 'aspect-[2/3]';

  const handleWatchlistClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWatchlist({ id, type, title, poster, backdrop });
  };

  return (
    <Link href={watchUrl}>
      <motion.div
        className={cn(
          'relative group cursor-pointer rounded-lg overflow-hidden bg-zinc-900',
          aspectRatio,
          className
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        whileHover={{ scale: 1.05 }}
        transition={{ duration: 0.2 }}
      >
        {/* Image */}
        <Image
          src={imageError ? '/placeholder.svg' : imageUrl}
          alt={title}
          fill
          unoptimized={imageUrl.startsWith('https://image.tmdb.org/')}
          sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 20vw"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          onError={() => setImageError(true)}
        />

        {/* Dark overlay on hover */}
        <div
          className={cn(
            'absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent',
            'transition-opacity duration-300',
            isHovered ? 'opacity-100' : 'opacity-60'
          )}
        />

        {/* Top badges */}
        {showOverlay && (
          <div className="absolute top-2 left-2 right-2 flex items-start justify-between z-10">
            {/* Season/Episode badge for TV shows */}
            {type === 'tv' && historyItem?.season && historyItem?.episode && (
              <span className="px-2 py-1 text-xs font-bold bg-red-600 text-white rounded">
                S{historyItem.season}:E{historyItem.episode}
              </span>
            )}

            {/* Watched checkmark */}
            {isWatched && (
              <span className="ml-auto p-1 bg-green-600 rounded-full">
                <Check className="w-3 h-3 text-white" />
              </span>
            )}

            {/* Rating badge */}
            {!historyItem && rating && (
              <span className="px-2 py-1 text-xs font-semibold bg-yellow-500 text-black rounded">
                {rating.toFixed(1)}
              </span>
            )}
          </div>
        )}

        {/* Mobile watchlist button - always visible */}
        <button
          className={cn(
            'absolute top-2 right-2 z-20 md:hidden',
            'w-8 h-8 rounded-full flex items-center justify-center',
            'shadow-lg backdrop-blur-sm transition-colors',
            inWatchlist
              ? 'bg-white text-black'
              : 'bg-black/60 text-white border border-white/30'
          )}
          onClick={handleWatchlistClick}
        >
          {inWatchlist ? (
            <Check className="w-4 h-4" />
          ) : (
            <Plus className="w-4 h-4" />
          )}
        </button>

        {/* Bottom content */}
        <div className="absolute bottom-0 left-0 right-0 p-3 z-10">
          {/* Progress bar */}
          {progress > 0 && progress < 90 && (
            <div className="w-full h-1 bg-zinc-700 rounded-full mb-2 overflow-hidden">
              <div
                className="h-full bg-red-600 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
          )}

          {/* Title */}
          <h3 className="text-sm font-semibold text-white line-clamp-1 mb-1">
            {title}
          </h3>

          {/* Year and type */}
          {year && (
            <p className="text-xs text-zinc-400">
              {year} {type === 'tv' ? '• Series' : '• Movie'}
            </p>
          )}

          {/* Continue watching timestamp */}
          {historyItem && historyItem.progress > 0 && (
            <div className="flex items-center gap-1 text-xs text-zinc-400 mt-1">
              <Clock className="w-3 h-3" />
              <span>{formatTime(historyItem.duration - historyItem.progress)} left</span>
            </div>
          )}
        </div>

        {/* Hover overlay with actions */}
        <motion.div
          className="absolute inset-0 flex items-center justify-center gap-3 z-20"
          initial={{ opacity: 0 }}
          animate={{ opacity: isHovered ? 1 : 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Play button */}
          <motion.div
            className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-lg"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
          >
            <Play className="w-6 h-6 text-black ml-1" fill="black" />
          </motion.div>

          {/* Watchlist button */}
          <motion.button
            className={cn(
              'w-10 h-10 rounded-full flex items-center justify-center border-2',
              inWatchlist
                ? 'bg-white border-white'
                : 'bg-zinc-800/80 border-zinc-500 hover:border-white'
            )}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleWatchlistClick}
          >
            {inWatchlist ? (
              <Check className="w-5 h-5 text-black" />
            ) : (
              <Plus className="w-5 h-5 text-white" />
            )}
          </motion.button>
        </motion.div>
      </motion.div>
    </Link>
  );
}

// Skeleton loader
export function MediaCardSkeleton({
  variant = 'default',
}: {
  variant?: 'default' | 'wide' | 'continue';
}) {
  const aspectRatio = variant === 'wide' || variant === 'continue' ? 'aspect-video' : 'aspect-[2/3]';

  return (
    <div className={cn('rounded-lg overflow-hidden', aspectRatio)}>
      <div className="w-full h-full animate-shimmer" />
    </div>
  );
}

// Helper function to format time
function formatTime(seconds: number): string {
  if (seconds < 0) seconds = 0;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

export default MediaCard;
