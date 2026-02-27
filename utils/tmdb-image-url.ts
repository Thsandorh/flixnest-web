const rawBase = (process.env.NEXT_PUBLIC_TMDB_IMG_DOMAIN || 'https://image.tmdb.org').replace(/\/+$/, '');
const rawOriginalBase = (process.env.NEXT_PUBLIC_TMDB_IMG_DOMAIN_ORIGINAL || '').replace(/\/+$/, '');

const normalizedBase = rawBase.includes('/t/p') ? rawBase : `${rawBase}/t/p`;

const ensureLeadingSlash = (value: string) => (value.startsWith('/') ? value : `/${value}`);

export const tmdbImageUrl = (path?: string | null, size = 'w500') => {
  const cleanPath = String(path || '').trim();
  if (!cleanPath) return '';
  if (cleanPath.startsWith('http://') || cleanPath.startsWith('https://')) return cleanPath;
  return `${normalizedBase}/${size}${ensureLeadingSlash(cleanPath)}`;
};

export const tmdbOriginalImageUrl = (path?: string | null) => {
  const cleanPath = String(path || '').trim();
  if (!cleanPath) return '';
  if (cleanPath.startsWith('http://') || cleanPath.startsWith('https://')) return cleanPath;

  if (!rawOriginalBase) {
    return tmdbImageUrl(cleanPath, 'original');
  }

  if (rawOriginalBase.includes('/t/p/original')) {
    return `${rawOriginalBase}${ensureLeadingSlash(cleanPath)}`;
  }
  if (rawOriginalBase.includes('/t/p')) {
    return `${rawOriginalBase}/original${ensureLeadingSlash(cleanPath)}`;
  }

  return `${rawOriginalBase}/t/p/original${ensureLeadingSlash(cleanPath)}`;
};
