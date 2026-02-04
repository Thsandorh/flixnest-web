import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from 'sonner';
import { Analytics } from '@vercel/analytics/react';

import { Navbar } from '@/components/navbar';
import { MobileNav } from '@/components/mobile-nav';
import { ServiceWorkerRegister } from '@/components/sw-register';
import { Providers } from './providers';
import 'vidstack/player/styles/base.css';
import 'vidstack/player/styles/default/theme.css';
import 'vidstack/player/styles/default/layouts/video.css';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Flixnest - Stream Movies & TV Shows',
  description: 'A modern streaming app for movies and TV shows. Watch your favorite content with smart history tracking and personalized recommendations.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Flixnest',
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  keywords: ['streaming', 'movies', 'tv shows', 'watch', 'flixnest'],
  authors: [{ name: 'Flixnest' }],
  openGraph: {
    type: 'website',
    title: 'Flixnest - Stream Movies & TV Shows',
    description: 'A modern streaming app for movies and TV shows.',
    siteName: 'Flixnest',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Flixnest - Stream Movies & TV Shows',
    description: 'A modern streaming app for movies and TV shows.',
  },
};

export const viewport: Viewport = {
  themeColor: '#09090b',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://api.themoviedb.org" />
        <link rel="preconnect" href="https://image.tmdb.org" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className={`${inter.className} bg-zinc-950 text-white antialiased`}>
        <Providers>
          <ServiceWorkerRegister />
          {/* Desktop Navbar */}
          <Navbar />

          {/* Main Content */}
          <div className="min-h-screen pb-24 md:pb-0">
            {children}
          </div>

          {/* Mobile Navigation */}
          <MobileNav />

          {/* Toast Notifications */}
          <Toaster
            position="top-center"
            toastOptions={{
              style: {
                background: '#27272a',
                color: '#fff',
                border: '1px solid #3f3f46',
              },
              className: 'sonner-toast',
            }}
            closeButton
            richColors
          />
          <Analytics />
        </Providers>
      </body>
    </html>
  );
}
