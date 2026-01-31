// Check if URL is an HLS/M3U8 stream
export function isHlsUrl(url: string): boolean {
  const lower = url.toLowerCase();
  return lower.includes('.m3u8');
}

// Build proxy URL for a stream
export function buildProxyUrl(url: string, headers?: Record<string, string>): string {
  // Don't double-proxy
  if (url.includes('/api/proxy?')) {
    return url;
  }

  const params = new URLSearchParams();
  params.set('url', url);

  if (headers && Object.keys(headers).length > 0) {
    params.set('headers', JSON.stringify(headers));
  }

  // Use absolute URL in browser, relative in SSR
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/api/proxy?${params.toString()}`;
  }

  return `/api/proxy?${params.toString()}`;
}
