import { NextRequest, NextResponse } from 'next/server';

// CORS headers for all responses
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
  'Access-Control-Allow-Headers': 'Range, Content-Type',
  'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Content-Type, Accept-Ranges',
};

// Check if URL is an M3U8 playlist
function isM3U8(url: string, contentType?: string): boolean {
  const urlLower = url.toLowerCase();
  const isM3U8Ext = urlLower.includes('.m3u8');
  const isM3U8Content = contentType?.includes('mpegurl') || contentType?.includes('x-mpegurl');
  return isM3U8Ext || !!isM3U8Content;
}

// Build proxy URL with headers
function buildProxyUrl(origin: string, targetUrl: string, headers?: Record<string, string>): string {
  const params = new URLSearchParams();
  params.set('url', targetUrl);
  if (headers && Object.keys(headers).length > 0) {
    params.set('headers', JSON.stringify(headers));
  }
  return `${origin}/api/proxy?${params.toString()}`;
}

// Rewrite M3U8 playlist URLs to go through proxy
function rewriteM3U8(
  content: string,
  baseUrl: string,
  origin: string,
  requestOrigin: string,
  headers?: Record<string, string>
): string {
  // Normalize line endings
  let text = content
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');

  // Handle escaped newlines (some servers return JSON-escaped content)
  if (text.includes('\\n')) {
    text = text.replace(/\\r\\n/g, '\n').replace(/\\n/g, '\n').replace(/\\r/g, '\n');
  }

  // Handle JSON-wrapped content
  const trimmed = text.trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    try {
      const parsed = JSON.parse(trimmed);
      if (typeof parsed === 'string') {
        text = parsed;
      }
    } catch {
      // Not valid JSON, continue with original
    }
  }

  // Convert relative URL to absolute and wrap with proxy
  const toAbsoluteProxied = (rawUrl: string): string => {
    const url = rawUrl.trim();
    if (!url) return url;

    // Skip data URIs, DRM schemes, etc.
    if (url.includes(':') && !/^https?:\/\//i.test(url) && !url.startsWith('//')) {
      return url;
    }

    let absoluteUrl: string;
    if (url.startsWith('//')) {
      absoluteUrl = 'https:' + url;
    } else if (url.startsWith('http://') || url.startsWith('https://')) {
      absoluteUrl = url;
    } else if (url.startsWith('/')) {
      absoluteUrl = origin + url;
    } else {
      absoluteUrl = baseUrl + url;
    }

    return buildProxyUrl(requestOrigin, absoluteUrl, headers);
  };

  // Process each line
  const lines = text.split('\n');
  const result: string[] = [];

  for (const line of lines) {
    const trimmedLine = line.trim();

    // Handle EXT tags with URI attributes
    if (trimmedLine.startsWith('#EXT')) {
      const rewritten = trimmedLine.replace(
        /URI="([^"]+)"/gi,
        (_, uri) => `URI="${toAbsoluteProxied(uri)}"`
      ).replace(
        /URI='([^']+)'/gi,
        (_, uri) => `URI='${toAbsoluteProxied(uri)}'`
      );
      result.push(rewritten);
      continue;
    }

    // Keep comments and empty lines as-is
    if (trimmedLine.startsWith('#') || trimmedLine === '') {
      result.push(line);
      continue;
    }

    // Proxy media segment URLs
    result.push(toAbsoluteProxied(trimmedLine));
  }

  return result.join('\n');
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const url = searchParams.get('url');
  const headersParam = searchParams.get('headers');

  if (!url) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400, headers: CORS_HEADERS });
  }

  try {
    const targetUrl = decodeURIComponent(url);

    // Validate URL
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(targetUrl);
    } catch {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400, headers: CORS_HEADERS });
    }

    // Parse custom headers
    let customHeaders: Record<string, string> = {};
    if (headersParam) {
      try {
        customHeaders = JSON.parse(headersParam);
      } catch {
        // Invalid JSON, ignore
      }
    }

    // Build request headers
    const isM3U8Request = isM3U8(targetUrl);
    const requestHeaders: HeadersInit = {
      'User-Agent': customHeaders['User-Agent'] || customHeaders['user-agent'] ||
        (isM3U8Request ? 'VLC/3.0.18 LibVLC/3.0.18' : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'),
      'Accept': '*/*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Origin': customHeaders['Origin'] || customHeaders['origin'] || parsedUrl.origin,
      'Referer': customHeaders['Referer'] || customHeaders['referer'] || parsedUrl.origin + '/',
    };

    // Add custom headers
    for (const [key, value] of Object.entries(customHeaders)) {
      const keyLower = key.toLowerCase();
      if (!['user-agent', 'accept', 'accept-language', 'origin', 'referer', 'host', 'connection'].includes(keyLower)) {
        requestHeaders[key] = value;
      }
    }

    // Forward Range header for video seeking
    const rangeHeader = request.headers.get('range');
    if (rangeHeader) {
      requestHeaders['Range'] = rangeHeader;
    }

    // Fetch from target
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: requestHeaders,
      redirect: 'follow',
    });

    if (!response.ok && response.status !== 206) {
      console.error(`[Proxy] Error ${response.status}: ${targetUrl.substring(0, 80)}`);
      return NextResponse.json(
        { error: `Upstream error: ${response.status}` },
        { status: response.status, headers: CORS_HEADERS }
      );
    }

    const contentType = response.headers.get('content-type') || 'application/octet-stream';

    // Build response headers
    const responseHeaders: Record<string, string> = { ...CORS_HEADERS, 'Content-Type': contentType };

    const contentLength = response.headers.get('content-length');
    if (contentLength) responseHeaders['Content-Length'] = contentLength;

    const contentRange = response.headers.get('content-range');
    if (contentRange) responseHeaders['Content-Range'] = contentRange;

    const acceptRanges = response.headers.get('accept-ranges');
    if (acceptRanges) responseHeaders['Accept-Ranges'] = acceptRanges;

    // Handle JSON responses
    if (contentType.includes('application/json')) {
      const data = await response.json();
      return NextResponse.json(data, { status: response.status, headers: { ...responseHeaders, 'Cache-Control': 'no-store' } });
    }

    // Handle M3U8 playlists - rewrite URLs
    if (isM3U8(targetUrl, contentType)) {
      const text = await response.text();
      const baseUrl = targetUrl.substring(0, targetUrl.lastIndexOf('/') + 1);
      const rewritten = rewriteM3U8(text, baseUrl, parsedUrl.origin, request.nextUrl.origin, customHeaders);

      return new NextResponse(rewritten, {
        status: response.status,
        headers: {
          ...responseHeaders,
          'Content-Type': 'application/vnd.apple.mpegurl',
          'Cache-Control': 'no-cache',
        },
      });
    }

    // Handle text responses
    if (contentType.includes('text/')) {
      const text = await response.text();
      return new NextResponse(text, { status: response.status, headers: responseHeaders });
    }

    // Stream binary content (video segments, etc.)
    return new NextResponse(response.body, { status: response.status, headers: responseHeaders });

  } catch (error) {
    console.error('[Proxy] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Proxy error' },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

export async function HEAD(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const url = searchParams.get('url');
  const headersParam = searchParams.get('headers');

  if (!url) {
    return new NextResponse(null, { status: 400, headers: CORS_HEADERS });
  }

  try {
    const targetUrl = decodeURIComponent(url);
    const parsedUrl = new URL(targetUrl);

    let customHeaders: Record<string, string> = {};
    if (headersParam) {
      try {
        customHeaders = JSON.parse(headersParam);
      } catch {}
    }

    const response = await fetch(targetUrl, {
      method: 'HEAD',
      headers: {
        'User-Agent': customHeaders['User-Agent'] || customHeaders['user-agent'] || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Origin': parsedUrl.origin,
        'Referer': parsedUrl.origin + '/',
      },
    });

    const headers: Record<string, string> = { ...CORS_HEADERS };

    const contentType = response.headers.get('content-type');
    if (contentType) headers['Content-Type'] = contentType;

    const contentLength = response.headers.get('content-length');
    if (contentLength) headers['Content-Length'] = contentLength;

    const acceptRanges = response.headers.get('accept-ranges');
    if (acceptRanges) headers['Accept-Ranges'] = acceptRanges;

    return new NextResponse(null, { status: response.status, headers });
  } catch {
    return new NextResponse(null, { status: 500, headers: CORS_HEADERS });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      ...CORS_HEADERS,
      'Access-Control-Max-Age': '86400',
    },
  });
}
