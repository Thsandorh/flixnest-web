import type { MetadataRoute } from 'next';

const normalizeBasePath = (value: string | undefined) => {
  if (!value) return '';

  const trimmed = value.trim();
  if (!trimmed || trimmed === '/') return '';

  const withoutTrailingSlash = trimmed.replace(/\/+$/, '');
  return withoutTrailingSlash.startsWith('/') ? withoutTrailingSlash : `/${withoutTrailingSlash}`;
};

const basePath = normalizeBasePath(process.env.NEXT_PUBLIC_BASE_PATH);
const withBasePath = (path: string) => `${basePath}${path}`;

export default function manifest(): MetadataRoute.Manifest {
  const startUrl = withBasePath('/');

  return {
    name: 'FlixNest',
    short_name: 'FlixNest',
    description: 'Online movie streaming platform for browsing and watching movies and series.',
    start_url: startUrl,
    scope: startUrl,
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#050505',
    theme_color: '#050505',
    icons: [
      {
        src: withBasePath('/mini-logo.png'),
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: withBasePath('/logo.png'),
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: withBasePath('/logo.png'),
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
