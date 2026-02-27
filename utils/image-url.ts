const IMG_BASE = (process.env.NEXT_PUBLIC_IMG_DOMAIN || '').replace(/\/+$/, '');

export default function resolveImageUrl(input?: string | null): string {
  const value = String(input || '').trim();
  if (!value) return '';

  if (value.startsWith('http://') || value.startsWith('https://')) return value;
  if (value.startsWith('//')) return `https:${value}`;

  if (!IMG_BASE) return value;
  if (value.startsWith('/')) return `${IMG_BASE}${value}`;
  return `${IMG_BASE}/${value}`;
}
