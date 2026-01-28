'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Home, Search, Bookmark, Puzzle } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | boolean)[]) {
  return twMerge(clsx(inputs));
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

export function MobileNav() {
  const pathname = usePathname();

  // Hide on watch pages
  if (pathname.startsWith('/watch')) {
    return null;
  }

  return (
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
      </div>
    </nav>
  );
}

export default MobileNav;
