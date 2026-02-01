'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Bell, ChevronDown, User, Settings, LogOut, Puzzle, Bookmark, Play, LogIn, Tag } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useAuthStore, useNotificationStore } from '@/store';
import { SettingsModal } from './settings-modal';
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

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/movies', label: 'Movies' },
  { href: '/series', label: 'Series' },
  { href: '/anime', label: 'Anime' },
  { href: '/search', label: 'Search' },
  { href: '/mylist', label: 'My List' },
  { href: '/addons', label: 'Addons' },
];

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCategoriesOpen, setIsCategoriesOpen] = useState(false);

  const { user, isAuthenticated, logout } = useAuthStore();
  const notifications = useNotificationStore((state) => state.notifications);
  const markAllRead = useNotificationStore((state) => state.markAllRead);
  const clearNotifications = useNotificationStore((state) => state.clearNotifications);
  const unreadCount = notifications.filter((item) => !item.read).length;

  // Fetch genres for categories dropdown
  const { data: movieGenres } = useQuery({
    queryKey: ['movie-genres'],
    queryFn: fetchMovieGenres,
    staleTime: 1000 * 60 * 60, // 1 hour
  });

  const { data: tvGenres } = useQuery({
    queryKey: ['tv-genres'],
    queryFn: fetchTVGenres,
    staleTime: 1000 * 60 * 60, // 1 hour
  });

  const handleSignOut = () => {
    logout();
    setIsProfileOpen(false);
    router.push('/');
  };

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close menus on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsProfileOpen(false);
    setIsNotificationsOpen(false);
    setIsCategoriesOpen(false);
  }, [pathname]);

  const formatNotificationTime = (timestamp: number) =>
    new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const handleToggleNotifications = () => {
    setIsProfileOpen(false);
    setIsNotificationsOpen((prev) => {
      const next = !prev;
      if (next) {
        markAllRead();
      }
      return next;
    });
  };

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-50 hidden md:block bg-zinc-950/90 transition-[background-color,backdrop-filter,border-color] duration-300',
        isScrolled
          ? 'glass border-x-0 border-t-0 border-b border-zinc-800/70'
          : 'bg-gradient-to-b from-zinc-950/90 to-transparent border-b border-transparent'
      )}
    >
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <nav className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center">
              <Play className="w-6 h-6 text-white" fill="white" />
            </div>
            <span className="text-xl font-bold text-white tracking-tight">
              Flixnest
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    'relative text-sm font-medium transition-colors',
                    isActive ? 'text-white' : 'text-zinc-400 hover:text-white'
                  )}
                >
                  {link.label}
                  {isActive && (
                    <motion.div
                      layoutId="navbar-indicator"
                      className="absolute -bottom-1 left-0 right-0 h-0.5 bg-red-500 rounded-full"
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}
                </Link>
              );
            })}

            {/* Categories Dropdown */}
            <div className="relative">
              <button
                onClick={() => {
                  setIsCategoriesOpen(!isCategoriesOpen);
                  setIsProfileOpen(false);
                  setIsNotificationsOpen(false);
                }}
                className={cn(
                  'flex items-center gap-1 text-sm font-medium transition-colors',
                  isCategoriesOpen ? 'text-white' : 'text-zinc-400 hover:text-white'
                )}
              >
                <Tag className="w-4 h-4" />
                Categories
                <ChevronDown
                  className={cn(
                    'w-4 h-4 transition-transform',
                    isCategoriesOpen && 'rotate-180'
                  )}
                />
              </button>

              <AnimatePresence>
                {isCategoriesOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setIsCategoriesOpen(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.98 }}
                      transition={{ duration: 0.15 }}
                      className="absolute left-0 top-full mt-2 w-[480px] z-50 glass rounded-xl shadow-2xl overflow-hidden"
                    >
                      <div className="grid grid-cols-2 divide-x divide-zinc-800">
                        {/* Movie Genres */}
                        <div className="p-4">
                          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
                            Movie Genres
                          </p>
                          <div className="space-y-1 max-h-[300px] overflow-y-auto">
                            {movieGenres?.map((genre: any) => (
                              <Link
                                key={genre.id}
                                href={`/discover/movie/${genre.id}`}
                                onClick={() => setIsCategoriesOpen(false)}
                                className="block px-3 py-2 text-sm text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                              >
                                {genre.name}
                              </Link>
                            ))}
                          </div>
                        </div>

                        {/* TV Genres */}
                        <div className="p-4">
                          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
                            TV Genres
                          </p>
                          <div className="space-y-1 max-h-[300px] overflow-y-auto">
                            {tvGenres?.map((genre: any) => (
                              <Link
                                key={genre.id}
                                href={`/discover/tv/${genre.id}`}
                                onClick={() => setIsCategoriesOpen(false)}
                                className="block px-3 py-2 text-sm text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                              >
                                {genre.name}
                              </Link>
                            ))}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-4">
            {/* Search Link */}
            <Link
              href="/search"
              className="p-2 text-zinc-400 hover:text-white transition-colors"
            >
              <Search className="w-5 h-5" />
            </Link>

            {/* Notifications */}
            <div className="relative">
              <button
                onClick={handleToggleNotifications}
                className="relative p-2 text-zinc-400 hover:text-white transition-colors"
                aria-label="Notifications"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-[10px] leading-4 text-white text-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              <AnimatePresence>
                {isNotificationsOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setIsNotificationsOpen(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.98 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-full mt-2 w-80 z-50 glass rounded-xl shadow-2xl overflow-hidden"
                    >
                      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
                        <p className="text-sm font-semibold text-white">Notifications</p>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={markAllRead}
                            className="text-xs text-zinc-400 hover:text-white transition-colors"
                          >
                            Mark all read
                          </button>
                          <button
                            onClick={clearNotifications}
                            className="text-xs text-red-400 hover:text-red-300 transition-colors"
                          >
                            Clear
                          </button>
                        </div>
                      </div>

                      <div className="max-h-[360px] overflow-y-auto">
                        {notifications.length === 0 ? (
                          <div className="p-4 text-sm text-zinc-400">
                            No notifications yet.
                          </div>
                        ) : (
                          notifications.map((item) => (
                            <div
                              key={item.id}
                              className={`px-4 py-3 border-b border-zinc-800/60 ${
                                item.read ? 'bg-transparent' : 'bg-red-500/5'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-sm font-semibold text-white">{item.title}</p>
                                <span className="text-[11px] text-zinc-500">
                                  {formatNotificationTime(item.createdAt)}
                                </span>
                              </div>
                              {item.message && (
                                <p className="text-xs text-zinc-400 mt-1">
                                  {item.message}
                                </p>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            {/* Profile/Auth */}
            {isAuthenticated ? (
              <div className="relative">
                <button
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  className="flex items-center gap-2 p-1 rounded-lg hover:bg-zinc-800 transition-colors"
                >
                  <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-orange-500 rounded-lg flex items-center justify-center">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <ChevronDown
                    className={cn(
                      'w-4 h-4 text-zinc-400 transition-transform',
                      isProfileOpen && 'rotate-180'
                    )}
                  />
                </button>

                <AnimatePresence>
                  {isProfileOpen && (
                    <>
                      {/* Backdrop */}
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsProfileOpen(false)}
                      />

                      {/* Dropdown */}
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 top-full mt-2 w-56 z-50 glass rounded-xl shadow-2xl overflow-hidden"
                      >
                        <div className="p-4 border-b border-zinc-800">
                          <p className="font-semibold text-white truncate">{user?.email}</p>
                          <p className="text-sm text-zinc-400">Pro Plan</p>
                        </div>

                        <div className="p-2">
                          <Link
                            href="/mylist"
                            className="flex items-center gap-3 px-3 py-2 text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                          >
                            <Bookmark className="w-4 h-4" />
                            My List
                          </Link>
                          <Link
                            href="/addons"
                            className="flex items-center gap-3 px-3 py-2 text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                          >
                            <Puzzle className="w-4 h-4" />
                            Addons
                          </Link>
                          <button
                            onClick={() => {
                              setIsSettingsOpen(true);
                              setIsProfileOpen(false);
                            }}
                            className="w-full flex items-center gap-3 px-3 py-2 text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                          >
                            <Settings className="w-4 h-4" />
                            Settings
                          </button>
                        </div>

                        <div className="p-2 border-t border-zinc-800">
                          <button 
                            onClick={handleSignOut}
                            className="w-full flex items-center gap-3 px-3 py-2 text-red-400 hover:text-red-300 hover:bg-zinc-800 rounded-lg transition-colors"
                          >
                            <LogOut className="w-4 h-4" />
                            Sign Out
                          </button>
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <Link
                href="/login"
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors"
              >
                <LogIn className="w-4 h-4" />
                <span>Sign In</span>
              </Link>
            )}
          </div>
        </nav>
      </div>

      {/* Settings Modal */}
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />

      {/* Registration Prompt - automatikusan megjelenik első látogatáskor */}
      <RegistrationPrompt />
    </header>
  );
}

export default Navbar;
