'use client';

import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, Search, Bookmark, Puzzle, Menu, Film, Tv, Sparkles, User, Settings, LogOut, LogIn, X, Tag, ChevronDown } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useAuthStore } from '@/store';
import { RegistrationPrompt } from './registration-prompt';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

function cn(...inputs: (string | undefined | null | boolean)[]) {
  return twMerge(clsx(inputs));
}

const TMDB_API_KEY = 'ffe7ef8916c61835264d2df68276ddc2';
const TMDB_BASE = 'https://api.themoviedb.org/3';

async function fetchMovieGenres() {
  const { data } = await axios.get(`${TMDB_BASE}/genre/movie/list?api_key=${TMDB_API_KEY}`);
  return data.genres;
}

async function fetchTVGenres() {
  const { data } = await axios.get(`${TMDB_BASE}/genre/tv/list?api_key=${TMDB_API_KEY}`);
  return data.genres;
}

const navItems = [
  {
    href: '/',
    label: 'Home',
    icon: Home,
  },
  {
    href: '/search',
    label: 'Search',
    icon: Search,
  },
  {
    href: '/mylist',
    label: 'My List',
    icon: Bookmark,
  },
  {
    href: '/addons',
    label: 'Addons',
    icon: Puzzle,
  },
];

const moreMenuItems = [
  {
    href: '/movies',
    label: 'Movies',
    icon: Film,
  },
  {
    href: '/series',
    label: 'Series',
    icon: Tv,
  },
  {
    href: '/anime',
    label: 'Anime',
    icon: Sparkles,
  },
];

export function MobileNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isMovieGenresOpen, setIsMovieGenresOpen] = useState(false);
  const [isTvGenresOpen, setIsTvGenresOpen] = useState(false);
  const { user, isAuthenticated, logout } = useAuthStore();

  // Fetch genres
  const { data: movieGenres } = useQuery({
    queryKey: ['movie-genres'],
    queryFn: fetchMovieGenres,
    staleTime: 1000 * 60 * 60,
  });

  const { data: tvGenres } = useQuery({
    queryKey: ['tv-genres'],
    queryFn: fetchTVGenres,
    staleTime: 1000 * 60 * 60,
  });

  const handleSignOut = () => {
    logout();
    setIsMoreMenuOpen(false);
    router.push('/');
  };

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
        {/* Background with blur */}
        <div className="absolute inset-0 bg-zinc-950/95 backdrop-blur-lg border-t border-zinc-800" />

        {/* Nav Items */}
        <div className="relative flex items-center justify-around safe-pb py-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className="relative flex flex-col items-center gap-1 px-4 py-2"
              >
                {/* Active indicator */}
                {isActive && (
                  <motion.div
                    layoutId="mobile-nav-indicator"
                    className="absolute -top-1 w-8 h-1 bg-red-500 rounded-full"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}

                <Icon
                  className={cn(
                    'w-6 h-6 transition-colors',
                    isActive ? 'text-white' : 'text-zinc-400'
                  )}
                />

                <span
                  className={cn(
                    'text-xs font-medium transition-colors',
                    isActive ? 'text-white' : 'text-zinc-400'
                  )}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}

          {/* More Menu Button */}
          <button
            onClick={() => setIsMoreMenuOpen(true)}
            className="relative flex flex-col items-center gap-1 px-4 py-2"
          >
            <Menu className="w-6 h-6 text-zinc-400" />
            <span className="text-xs font-medium text-zinc-400">More</span>
          </button>
        </div>
      </nav>

      {/* More Menu Modal */}
      <AnimatePresence>
        {isMoreMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMoreMenuOpen(false)}
              className="fixed inset-0 bg-black/60 z-[60] md:hidden"
            />

            {/* Menu Sheet */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-[70] md:hidden bg-zinc-900 rounded-t-3xl border-t border-zinc-800 max-h-[80vh] overflow-y-auto"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-zinc-800 sticky top-0 bg-zinc-900 z-10">
                <h3 className="text-lg font-semibold text-white">Menu</h3>
                <button
                  onClick={() => setIsMoreMenuOpen(false)}
                  className="p-2 text-zinc-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Menu Content */}
              <div className="p-4 space-y-6">
                {/* Additional Navigation */}
                <div>
                  <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
                    Browse
                  </p>
                  <div className="space-y-2">
                    {moreMenuItems.map((item) => {
                      const isActive = pathname === item.href;
                      const Icon = item.icon;

                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setIsMoreMenuOpen(false)}
                          className={cn(
                            'flex items-center gap-3 p-3 rounded-lg transition-colors',
                            isActive
                              ? 'bg-red-600 text-white'
                              : 'bg-zinc-800/50 text-zinc-300 hover:bg-zinc-800'
                          )}
                        >
                          <Icon className="w-5 h-5" />
                          <span className="font-medium">{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>

                {/* Categories Section */}
                <div>
                  <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
                    Categories
                  </p>
                  <div className="space-y-2">
                    {/* Movie Genres Dropdown */}
                    <button
                      onClick={() => setIsMovieGenresOpen(!isMovieGenresOpen)}
                      className="w-full flex items-center justify-between gap-3 p-3 rounded-lg bg-zinc-800/50 text-zinc-300 hover:bg-zinc-800 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Film className="w-5 h-5" />
                        <span className="font-medium">Movie Genres</span>
                      </div>
                      <ChevronDown className={cn('w-4 h-4 transition-transform', isMovieGenresOpen && 'rotate-180')} />
                    </button>
                    <AnimatePresence>
                      {isMovieGenresOpen && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="grid grid-cols-2 gap-1 pl-3 pt-1">
                            {movieGenres?.map((genre: any) => (
                              <Link
                                key={genre.id}
                                href={`/discover/movie/${genre.id}`}
                                onClick={() => setIsMoreMenuOpen(false)}
                                className="px-3 py-2 text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                              >
                                {genre.name}
                              </Link>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* TV Genres Dropdown */}
                    <button
                      onClick={() => setIsTvGenresOpen(!isTvGenresOpen)}
                      className="w-full flex items-center justify-between gap-3 p-3 rounded-lg bg-zinc-800/50 text-zinc-300 hover:bg-zinc-800 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Tv className="w-5 h-5" />
                        <span className="font-medium">TV Genres</span>
                      </div>
                      <ChevronDown className={cn('w-4 h-4 transition-transform', isTvGenresOpen && 'rotate-180')} />
                    </button>
                    <AnimatePresence>
                      {isTvGenresOpen && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="grid grid-cols-2 gap-1 pl-3 pt-1">
                            {tvGenres?.map((genre: any) => (
                              <Link
                                key={genre.id}
                                href={`/discover/tv/${genre.id}`}
                                onClick={() => setIsMoreMenuOpen(false)}
                                className="px-3 py-2 text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                              >
                                {genre.name}
                              </Link>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* Account Section */}
                <div>
                  <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
                    Account
                  </p>
                  <div className="space-y-2">
                    {isAuthenticated ? (
                      <>
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-zinc-800/50">
                          <User className="w-5 h-5 text-zinc-400" />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-white">
                              {user?.email || 'User'}
                            </p>
                            <p className="text-xs text-zinc-500">Signed in</p>
                          </div>
                        </div>
                        <Link
                          href="/settings"
                          onClick={() => setIsMoreMenuOpen(false)}
                          className="flex items-center gap-3 p-3 rounded-lg bg-zinc-800/50 text-zinc-300 hover:bg-zinc-800 transition-colors"
                        >
                          <Settings className="w-5 h-5" />
                          <span className="font-medium">Settings</span>
                        </Link>
                        <button
                          onClick={handleSignOut}
                          className="w-full flex items-center gap-3 p-3 rounded-lg bg-zinc-800/50 text-red-400 hover:bg-zinc-800 transition-colors"
                        >
                          <LogOut className="w-5 h-5" />
                          <span className="font-medium">Sign Out</span>
                        </button>
                      </>
                    ) : (
                      <Link
                        href="/login"
                        onClick={() => setIsMoreMenuOpen(false)}
                        className="flex items-center gap-3 p-3 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors"
                      >
                        <LogIn className="w-5 h-5" />
                        <span className="font-medium">Sign In</span>
                      </Link>
                    )}
                  </div>
                </div>
              </div>

              {/* Safe area padding */}
              <div className="h-8" />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Registration Prompt - mobilon is megjelenik */}
      <RegistrationPrompt />
    </>
  );
}

export default MobileNav;
