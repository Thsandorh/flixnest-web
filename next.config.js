/** @type {import('next').NextConfig} */
// If the app is mounted under a sub-path behind a reverse proxy (e.g. https://domain.tld/online),
// set NEXT_BASE_PATH=/online at build time and ensure your proxy forwards requests accordingly.
const basePath = process.env.NEXT_BASE_PATH || '';
const assetPrefix = basePath ? `${basePath}/` : undefined;

const nextConfig = {
  basePath,
  assetPrefix,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'image.tmdb.org',
        pathname: '/t/p/**',
      },
      {
        protocol: 'https',
        hostname: 'images.justwatch.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'live.metahub.space',
        pathname: '/**',
      },
    ],
    unoptimized: false,
  },
  experimental: {
    optimizePackageImports: ['lucide-react', 'framer-motion'],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
