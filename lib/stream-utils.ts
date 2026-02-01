// Check if URL is an HLS/M3U8 stream
export function isHlsUrl(url: string): boolean {
  const lower = url.toLowerCase();
  return lower.includes('.m3u8');
}

// Build proxy URL for a stream
export function buildProxyUrl(
  url: string,
  headers?: Record<string, string>,
  absolute: boolean = true,
  ext?: string
): string {
  // Don't double-proxy
  if (url.includes('/api/proxy?')) {
    return url;
  }

  const params = new URLSearchParams();
  params.set('url', url);

  if (headers && Object.keys(headers).length > 0) {
    params.set('headers', JSON.stringify(headers));

    const headerEntries = Object.entries(headers);
    const uaEntry = headerEntries.find(
      ([key]) => key.toLowerCase() === 'user-agent'
    );
    const refererEntry = headerEntries.find(
      ([key]) => key.toLowerCase() === 'referer' || key.toLowerCase() === 'referrer'
    );

    if (uaEntry?.[1]) {
      params.set('ua', uaEntry[1]);
    }
    if (refererEntry?.[1]) {
      params.set('referer', refererEntry[1]);
    }
  }

  let queryString = params.toString();
  if (ext) {
    // Add extension to the end to help some players with type detection
    queryString += `&ext=${ext}`;
  }

  // If absolute is requested and we are in the browser, use absolute URL
  if (absolute && typeof window !== 'undefined') {
    const origin = window.location.origin.replace('localhost', '127.0.0.1');
    return `${origin}/api/proxy?${queryString}`;
  }

  // Otherwise return relative URL
  return `/api/proxy?${queryString}`;
}
