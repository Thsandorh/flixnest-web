import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const normalizeBasePath = (value) => {
  if (!value) return '';

  const trimmed = value.trim();
  if (!trimmed || trimmed === '/') return '';

  const withoutTrailingSlash = trimmed.replace(/\/+$/, '');
  return withoutTrailingSlash.startsWith('/') ? withoutTrailingSlash : `/${withoutTrailingSlash}`;
};

const basePath = normalizeBasePath(process.env.NEXT_PUBLIC_BASE_PATH);

const extraImageHosts = [
  process.env.NEXT_PUBLIC_IMG_DOMAIN,
  process.env.NEXT_PUBLIC_TMDB_IMG_DOMAIN,
]
  .map((value) => {
    try {
      return value ? new URL(value).hostname : null;
    } catch {
      return null;
    }
  })
  .filter(Boolean);

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  basePath,
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': __dirname,
      data: path.join(__dirname, 'data'),
      lib: path.join(__dirname, 'lib'),
      services: path.join(__dirname, 'services'),
      types: path.join(__dirname, 'types'),
      utils: path.join(__dirname, 'utils'),
    };

    return config;
  },
  images: {
    domains: Array.from(
      new Set([
        'img.ophim.live',
        'lh3.googleusercontent.com',
        'image.tmdb.org',
        'media.kitsu.app',
        'assets.fanart.tv',
        'images.metahub.space',
        'i.imgur.com',
        ...extraImageHosts,
      ])
    ),
  },
};

export default nextConfig;
