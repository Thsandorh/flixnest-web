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
