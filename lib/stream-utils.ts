const VLC_USER_AGENT = 'VLC/3.0.18 LibVLC/3.0.18';

export const isHlsUrl = (url: string) =>
  /\.m3u8(\?.*)?$/i.test(url) || url.toLowerCase().includes('m3u8');

export const buildProxyUrl = (url: string, headers?: Record<string, string>) => {
  if (url.includes('/api/proxy?')) return url;

  const params = new URLSearchParams();
  params.set('url', url);

  if (headers && Object.keys(headers).length > 0) {
    params.set('headers', JSON.stringify(headers));
  }

  return `/api/proxy?${params.toString()}`;
};

export const buildVlcUrl = (url: string) => {
  const trimmed = url.trim();
  const withoutScheme = trimmed.startsWith('vlc://')
    ? trimmed.slice('vlc://'.length)
    : trimmed;

  return `vlc://${encodeURI(withoutScheme)}`;
};

export const getVlcProxyHeaders = (
  url: string,
  headers?: Record<string, string>
): Record<string, string> | undefined => {
  const defaults: Record<string, string> = isHlsUrl(url)
    ? { 'User-Agent': VLC_USER_AGENT }
    : {};

  if (!headers || Object.keys(headers).length === 0) {
    return Object.keys(defaults).length > 0 ? defaults : undefined;
  }

  return { ...defaults, ...headers };
};
