'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Bell, ChevronDown, User, Settings, LogOut, Puzzle, Bookmark, Play } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | boolean)[]) {
  return twMerge(clsx(inputs));
}

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/search', label: 'Search' },
  { href: '/mylist', label: 'My List' },
  { href: '/addons', label: 'Addons' },
];

export function Navbar() {
  const pathname = usePathname();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

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
  }, [pathname]);

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-50 hidden md:block transition-all duration-300',
        isScrolled ? 'glass' : 'bg-gradient-to-b from-zinc-950/80 to-transparent'
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
            <button className="relative p-2 text-zinc-400 hover:text-white transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
            </button>

            {/* Profile Dropdown */}
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
                        <p className="font-semibold text-white">Guest User</p>
                        <p className="text-sm text-zinc-400">Free Plan</p>
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
                        <button className="w-full flex items-center gap-3 px-3 py-2 text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors">
                          <Settings className="w-4 h-4" />
                          Settings
                        </button>
                      </div>

                      <div className="p-2 border-t border-zinc-800">
                        <button className="w-full flex items-center gap-3 px-3 py-2 text-red-400 hover:text-red-300 hover:bg-zinc-800 rounded-lg transition-colors">
                          <LogOut className="w-4 h-4" />
                          Sign Out
                        </button>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </nav>
      </div>
    </header>
  );
}

export default Navbar;
