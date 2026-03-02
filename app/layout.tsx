import type { Metadata, Viewport } from 'next';
import './globals.css';
import 'swiper/css';
import 'swiper/css/effect-fade';
import Providers from './providers';
import PwaRegister from './pwa-register';

const normalizeBasePath = (value: string | undefined) => {
  if (!value) return '';

  const trimmed = value.trim();
  if (!trimmed || trimmed === '/') return '';

  const withoutTrailingSlash = trimmed.replace(/\/+$/, '');
  return withoutTrailingSlash.startsWith('/') ? withoutTrailingSlash : `/${withoutTrailingSlash}`;
};

const basePath = normalizeBasePath(process.env.NEXT_PUBLIC_BASE_PATH);
const withBasePath = (path: string) => `${basePath}${path}`;

export const metadata: Metadata = {
  title: {
    default: 'FlixNest',
    template: '%s | FlixNest',
  },
  description: 'Online movie streaming platform for browsing and watching movies and series.',
  applicationName: 'FlixNest',
  manifest: withBasePath('/manifest.webmanifest'),
  icons: {
    icon: [
      { url: withBasePath('/favicon.ico') },
      { url: withBasePath('/logo.png'), sizes: '512x512', type: 'image/png' },
      { url: withBasePath('/mini-logo.png'), sizes: '192x192', type: 'image/png' },
    ],
    apple: [{ url: withBasePath('/mini-logo.png') }],
  },
  appleWebApp: {
    capable: true,
    title: 'FlixNest',
    statusBarStyle: 'black-translucent',
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: '#050505',
  colorScheme: 'dark',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-black text-white relative flex flex-col">
        <Providers>{children}</Providers>
        <PwaRegister />
      </body>
    </html>
  );
}
