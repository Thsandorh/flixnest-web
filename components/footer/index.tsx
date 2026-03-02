'use client';

import Link from 'next/link';
import { FaGithub } from 'react-icons/fa';

const infoLinks = [
  { label: 'Home', href: '/' },
  { label: 'Search', href: '/search' },
  { label: 'Latest updates', href: '/movies/recent' },
  { label: 'Collections', href: '/movies/collection' },
  { label: 'Profile', href: '/profile' },
];

const catalogLinks = [
  { label: 'Movie catalog', href: '/movies/format/phim-le' },
  { label: 'Series catalog', href: '/movies/format/phim-bo' },
  { label: 'Anime catalog', href: '/movies/format/hoat-hinh' },
  { label: 'TV show catalog', href: '/movies/format/tv-shows' },
  { label: 'Action movies', href: '/movies/type/movie-action' },
  { label: 'Drama series', href: '/movies/type/series-drama' },
  { label: 'Popular anime', href: '/movies/type/anime-kitsu-popular' },
  { label: 'Trending anime', href: '/movies/type/anime-kitsu-trending' },
  { label: 'Top rated anime', href: '/movies/type/anime-kitsu-top-rated' },
  { label: 'Upcoming anime', href: '/movies/type/anime-kitsu-upcoming' },
];

export default function Footer() {
  return (
    <footer className="w-full bg-black text-gray-300 relative">
      <div className="h-1 w-full bg-gradient-to-r from-red-700 via-red-600 to-red-700"></div>

      <div className="container mx-auto px-4 md:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-20">
          <div className="space-y-5">
            <Link href="/" className="tv-nav-link inline-block rounded-xl px-2 py-1">
              <h2 className="text-4xl font-bold text-red-600 tracking-tight">FLIXNEST</h2>
            </Link>
            <p className="text-sm text-gray-400 leading-relaxed">
              FlixNest is a high-quality online movie platform with Full HD streaming, updated content,
              and a wide catalog of films, series, and anime from many countries and genres.
            </p>

            <div className="flex items-center space-x-4 pt-2">
              <Link
                href="https://github.com"
                target="_blank"
                rel="noreferrer"
                className="tv-icon-button bg-gray-900 hover:bg-red-600 text-white p-2 rounded-full transition-colors duration-300"
                aria-label="GitHub"
              >
                <FaGithub size={24} />
              </Link>
            </div>
          </div>

          <div className="space-y-5">
            <h3 className="text-xl font-bold text-white mb-4 relative pl-3 border-l-4 border-red-600">Information</h3>
            <ul className="space-y-3 grid grid-cols-1 gap-2">
              {infoLinks.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="tv-nav-link text-sm text-gray-400 hover:text-red-500 transition-colors duration-300 flex items-center group rounded-xl px-2 py-1"
                  >
                    <span className="w-1 h-1 bg-red-600 rounded-full mr-2 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-5">
            <h3 className="text-xl font-bold text-white mb-4 relative pl-3 border-l-4 border-red-600">Movie categories</h3>
            <div className="grid grid-cols-2 gap-3">
              {[catalogLinks.slice(0, 5), catalogLinks.slice(5)].map((column, index) => (
                <div key={index}>
                  <ul className="space-y-3">
                    {column.map((item) => (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          className="tv-nav-link text-sm text-gray-400 hover:text-red-500 transition-colors duration-300 flex items-center group rounded-xl px-2 py-1"
                        >
                          <span className="w-1 h-1 bg-red-600 rounded-full mr-2 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                          {item.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-800 text-center">
          <p className="text-sm text-gray-500">© 2024 FLIXNEST. All rights reserved.</p>
          <p className="mt-2 text-xs text-gray-600">
            FLIXNEST does not host any content on this website. All content is sourced from third-party providers.
          </p>
          <p className="mt-2 text-xs text-gray-600">Watch high-quality movies online on FLIXNEST.</p>
        </div>
      </div>
    </footer>
  );
}
