'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { useInView } from 'react-intersection-observer';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { MediaCard, MediaCardSkeleton, type MediaCardProps } from './media-card';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | boolean)[]) {
  return twMerge(clsx(inputs));
}

export interface MediaItem {
  id: number | string;
  title?: string;
  name?: string;
  poster_path?: string;
  backdrop_path?: string;
  media_type?: 'movie' | 'tv';
  vote_average?: number;
  release_date?: string;
  first_air_date?: string;
}

interface InfiniteMediaRowProps {
  title: string;
  items?: MediaItem[];
  historyItems?: Array<MediaCardProps & { historyItem?: any }>;
  isLoading?: boolean;
  variant?: 'default' | 'wide' | 'continue';
  defaultType?: 'movie' | 'tv';
  onLoadMore?: () => void;
  hasMore?: boolean;
  className?: string;
}

export function InfiniteMediaRow({
  title,
  items,
  historyItems,
  isLoading = false,
  variant = 'default',
  defaultType = 'movie',
  onLoadMore,
  hasMore = false,
  className,
}: InfiniteMediaRowProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);

  // Intersection observer for infinite loading
  const { ref: loadMoreRef, inView } = useInView({
    threshold: 0,
    rootMargin: '100px',
  });

  useEffect(() => {
    if (inView && hasMore && onLoadMore) {
      onLoadMore();
    }
  }, [inView, hasMore, onLoadMore]);

  // Update arrow visibility based on scroll position
  const updateArrows = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const { scrollLeft, scrollWidth, clientWidth } = container;
    setShowLeftArrow(scrollLeft > 20);
    setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 20);
  }, []);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    container.addEventListener('scroll', updateArrows, { passive: true });
    updateArrows();

    return () => container.removeEventListener('scroll', updateArrows);
  }, [updateArrows, items, historyItems]);

  // Scroll functions
  const scroll = (direction: 'left' | 'right') => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const scrollAmount = container.clientWidth * 0.8;
    container.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  // Determine which items to render
  const renderItems = historyItems || items?.map((item) => ({
    id: String(item.id),
    title: item.title || item.name || 'Unknown',
    poster: item.poster_path || '',
    backdrop: item.backdrop_path,
    type: (item.media_type || defaultType) as 'movie' | 'tv',
    rating: item.vote_average,
    year: (item.release_date || item.first_air_date || '').split('-')[0],
  }));

  const itemCount = renderItems?.length || 0;
  const skeletonCount = isLoading ? 6 : 0;

  if (!isLoading && itemCount === 0) {
    return null;
  }

  return (
    <section className={cn('relative py-4', className)}>
      {/* Title */}
      <h2 className="text-xl md:text-2xl font-bold text-white mb-4 px-4 md:px-12">
        {title}
      </h2>

      {/* Scrollable container */}
      <div className="relative group">
        {/* Left scroll button */}
        <AnimatePresence>
          {showLeftArrow && !isLoading && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={cn(
                'absolute left-0 top-0 bottom-0 z-20 w-12 md:w-16',
                'bg-gradient-to-r from-zinc-950 to-transparent',
                'flex items-center justify-start pl-2',
                'opacity-0 group-hover:opacity-100 transition-opacity',
                'cursor-pointer'
              )}
              onClick={() => scroll('left')}
            >
              <ChevronLeft className="w-8 h-8 text-white" />
            </motion.button>
          )}
        </AnimatePresence>

        {/* Right scroll button */}
        <AnimatePresence>
          {showRightArrow && !isLoading && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={cn(
                'absolute right-0 top-0 bottom-0 z-20 w-12 md:w-16',
                'bg-gradient-to-l from-zinc-950 to-transparent',
                'flex items-center justify-end pr-2',
                'opacity-0 group-hover:opacity-100 transition-opacity',
                'cursor-pointer'
              )}
              onClick={() => scroll('right')}
            >
              <ChevronRight className="w-8 h-8 text-white" />
            </motion.button>
          )}
        </AnimatePresence>

        {/* Items container */}
        <div
          ref={scrollContainerRef}
          className={cn(
            'flex gap-3 overflow-x-auto scrollbar-hide',
            'px-4 md:px-12 pb-4',
            'scroll-smooth'
          )}
        >
          {/* Render items */}
          {renderItems?.map((item, index) => (
            <div
              key={`${item.id}-${index}`}
              className={cn(
                'flex-none',
                variant === 'wide' || variant === 'continue'
                  ? 'w-[280px] md:w-[320px]'
                  : 'w-[140px] md:w-[180px]'
              )}
            >
              <MediaCard
                id={String(item.id)}
                title={item.title}
                poster={item.poster}
                backdrop={item.backdrop}
                type={item.type}
                rating={item.rating}
                year={item.year}
                historyItem={'historyItem' in item ? item.historyItem : undefined}
                variant={variant}
              />
            </div>
          ))}

          {/* Skeleton loaders */}
          {isLoading &&
            Array.from({ length: skeletonCount }).map((_, i) => (
              <div
                key={`skeleton-${i}`}
                className={cn(
                  'flex-none',
                  variant === 'wide' || variant === 'continue'
                    ? 'w-[280px] md:w-[320px]'
                    : 'w-[140px] md:w-[180px]'
                )}
              >
                <MediaCardSkeleton variant={variant} />
              </div>
            ))}

          {/* Load more trigger */}
          {hasMore && <div ref={loadMoreRef} className="w-4 flex-none" />}
        </div>
      </div>
    </section>
  );
}

export default InfiniteMediaRow;
