import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const url = searchParams.get('url');
  const headersParam = searchParams.get('headers');
  // Legacy support for old referer/ua params
  const refererParam = searchParams.get('referer') || '';
  const uaParam = searchParams.get('ua') || '';

  if (!url) {
    return NextResponse.json(
      { error: 'URL parameter is required' },
      { status: 400 }
    );
  }

  try {
    const decodedUrl = decodeURIComponent(url);
    const isM3u8Url = /\.m3u8(\?.*)?$/i.test(decodedUrl) || decodedUrl.includes('.m3u8');
    const defaultUserAgent = isM3u8Url
      ? 'VLC/3.0.18 LibVLC/3.0.18'
      : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
    console.log('[Proxy] Fetching:', decodedUrl.substring(0, 100) + '...');

    // Validate URL
    let targetUrl: URL;
    try {
      targetUrl = new URL(decodedUrl);
    } catch {
      console.error('[Proxy] Invalid URL:', decodedUrl);
      return NextResponse.json(
        { error: 'Invalid URL provided' },
        { status: 400 }
      );
    }

    // Parse custom headers from JSON parameter
    let customHeaders: Record<string, string> = {};
    if (headersParam) {
      try {
        customHeaders = JSON.parse(headersParam);
      } catch {
        // Invalid JSON, ignore
      }
    }

    // Prepare headers for the upstream request
    const upstreamHeaders: HeadersInit = {
      'User-Agent':
        customHeaders['User-Agent'] ||
        customHeaders['user-agent'] ||
        uaParam ||
        defaultUserAgent,
      'Accept': request.headers.get('accept') || '*/*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Referer':
        customHeaders['Referer'] ||
        customHeaders['referer'] ||
        refererParam ||
        targetUrl.origin,
    };

    // Add any other custom headers (excluding ones we've already set)
    const excludedHeaders = ['user-agent', 'accept', 'accept-language', 'referer', 'host', 'connection'];
    for (const [key, value] of Object.entries(customHeaders)) {
      if (!excludedHeaders.includes(key.toLowerCase()) && value) {
        upstreamHeaders[key] = value;
      }
    }

    // Forward Range header if present (for video seeking)
    const rangeHeader = request.headers.get('range');
    if (rangeHeader) {
      upstreamHeaders['Range'] = rangeHeader;
    }

    const response = await fetch(targetUrl.toString(), {
      method: 'GET',
      headers: upstreamHeaders,
    });

    console.log('[Proxy] Response:', response.status, response.statusText, 'for', targetUrl.hostname);

    if (!response.ok) {
      console.error('[Proxy] Error response:', response.status, await response.text().catch(() => ''));
      return NextResponse.json(
        { error: `Upstream error: ${response.status}` },
        { status: response.status }
      );
    }

    const contentType = response.headers.get('content-type') || 'application/octet-stream';

    // Prepare response headers
    const responseHeaders: HeadersInit = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Range, Content-Type, Authorization',
      'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Content-Type',
      'Content-Type': contentType,
    };

    // Forward important headers for video streaming
    const contentLength = response.headers.get('content-length');
    if (contentLength) {
      responseHeaders['Content-Length'] = contentLength;
    }

    const contentRange = response.headers.get('content-range');
    if (contentRange) {
      responseHeaders['Content-Range'] = contentRange;
    }

    const acceptRanges = response.headers.get('accept-ranges');
    if (acceptRanges) {
      responseHeaders['Accept-Ranges'] = acceptRanges;
    }

    // Check if URL looks like an M3U8 playlist (regardless of content-type)
    const isM3u8Content = contentType.includes('mpegurl') || contentType.includes('x-mpegurl');

    // Handle different content types
    if (contentType.includes('application/json')) {
      const data = await response.json();
      return NextResponse.json(data, {
        status: response.status,
        headers: {
          ...responseHeaders,
          'Cache-Control': 'no-store, max-age=0, must-revalidate',
        },
      });
    } else if (isM3u8Url || isM3u8Content || contentType.includes('text/')) {
      // Handle m3u8 playlists - need to proxy URLs inside them
      const text = await response.text();
      console.log('[Proxy] Content-Type:', contentType);
      console.log('[Proxy] Response text (first 500 chars):', text.substring(0, 500));

      // If it's an m3u8 file, proxy the URLs inside
      if (isM3u8Url || isM3u8Content) {
        const baseUrl = decodedUrl.substring(0, decodedUrl.lastIndexOf('/') + 1);
        const urlOrigin = targetUrl.origin;

        let playlistText = text;
        const trimmed = playlistText.trim();
        if (
          (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
          (trimmed.startsWith("'") && trimmed.endsWith("'"))
        ) {
          try {
            const parsed = JSON.parse(trimmed);
            if (typeof parsed === 'string') {
              playlistText = parsed;
            }
          } catch {
            // ignore invalid JSON string
          }
        }

        if (playlistText.includes('\\n') || playlistText.includes('\\r')) {
          playlistText = playlistText
            .replace(/\\r\\n/g, '\n')
            .replace(/\\n/g, '\n')
            .replace(/\\r/g, '\n');
        }

        // Normalize line endings (handle \r\n, \r, and \n)
        const normalizedText = playlistText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

        // Helper to build an absolute URL and wrap it with our proxy
        const toProxiedUrl = (rawUrl: string) => {
          const cleaned = rawUrl.trim();

          // Skip empty lines
          if (!cleaned) return cleaned;

          // Skip special URI schemes (e.g., data:, skd:, urn:) but keep relative URLs
          if (cleaned.includes(':') && !/^https?:\/\//i.test(cleaned) && !cleaned.startsWith('//')) {
            return cleaned;
          }

          let absoluteUrl = cleaned;
          if (cleaned.startsWith('//')) {
            // Protocol-relative URL
            absoluteUrl = `https:${cleaned}`;
          } else if (cleaned.startsWith('http://') || cleaned.startsWith('https://')) {
            // Already absolute URL
            absoluteUrl = cleaned;
          } else if (cleaned.startsWith('/')) {
            // Absolute path - use origin
            absoluteUrl = urlOrigin + cleaned;
          } else {
            // Relative path - use base URL
            absoluteUrl = baseUrl + cleaned;
          }

          const params = new URLSearchParams();
          params.set('url', absoluteUrl);
          // Pass headers as JSON if available, otherwise fall back to legacy params
          if (headersParam) {
            params.set('headers', headersParam);
          } else {
            if (refererParam) params.set('referer', refererParam);
            if (uaParam) params.set('ua', uaParam);
          }
          return `/api/proxy?${params.toString()}`;
        };

        const proxiedM3u8 = normalizedText
          .split('\n')
          .map((line) => {
            const trimmed = line.trim();

            // Proxy URIs embedded inside directive lines (keys, maps, audio/subs, etc.)
            if (trimmed.startsWith('#EXT')) {
              const rewritten = trimmed.replace(
                /URI=(\"|')(.*?)(\1)/gi,
                (_match, quote, uri) => `URI=${quote}${toProxiedUrl(uri)}${quote}`
              );
              return rewritten;
            }

            // Keep other comments as-is
            if (trimmed.startsWith('#') || trimmed === '') {
              return line;
            }

            // Proxy media segment or playlist URLs
            return toProxiedUrl(trimmed);
          })
          .join('\n');

        // Ensure correct content-type for M3U8 playlists
        const m3u8Headers = {
          ...responseHeaders,
          'Content-Type': 'application/vnd.apple.mpegurl',
        };

        return new NextResponse(proxiedM3u8, {
          status: response.status,
          headers: m3u8Headers,
        });
      }

      return new NextResponse(text, {
        status: response.status,
        headers: responseHeaders,
      });
    } else {
      // Stream binary content (videos, subtitles, etc.)
      // Use ReadableStream for better performance with large files
      const body = response.body;

      return new NextResponse(body, {
        status: response.status,
        headers: responseHeaders,
      });
    }
  } catch (error) {
    console.error('Proxy error:', error);

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return NextResponse.json(
          { error: 'Request timeout' },
          { status: 504 }
        );
      }
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function HEAD(request: NextRequest) {
  // Handle HEAD requests for video metadata
  const searchParams = request.nextUrl.searchParams;
  const url = searchParams.get('url');
  const headersParam = searchParams.get('headers');
  const refererParam = searchParams.get('referer') || '';
  const uaParam = searchParams.get('ua') || '';

  if (!url) {
    return new NextResponse(null, { status: 400 });
  }

  try {
    const decodedUrl = decodeURIComponent(url);
    const isM3u8Url = /\.m3u8(\?.*)?$/i.test(decodedUrl) || decodedUrl.includes('.m3u8');
    const defaultUserAgent = isM3u8Url
      ? 'VLC/3.0.18 LibVLC/3.0.18'
      : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

    // Parse custom headers from JSON parameter
    let customHeaders: Record<string, string> = {};
    if (headersParam) {
      try {
        customHeaders = JSON.parse(headersParam);
      } catch {
        // Invalid JSON, ignore
      }
    }

    const response = await fetch(decodedUrl, {
      method: 'HEAD',
      headers: {
        'User-Agent':
          customHeaders['User-Agent'] ||
          customHeaders['user-agent'] ||
          uaParam ||
          defaultUserAgent,
        'Referer':
          customHeaders['Referer'] ||
          customHeaders['referer'] ||
          refererParam ||
          new URL(decodedUrl).origin,
      },
    });

    const headers: HeadersInit = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Range, Content-Type, Authorization',
      'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Content-Type, Accept-Ranges',
    };

    // Forward important headers
    const contentType = response.headers.get('content-type');
    if (contentType) headers['Content-Type'] = contentType;

    const contentLength = response.headers.get('content-length');
    if (contentLength) headers['Content-Length'] = contentLength;

    const acceptRanges = response.headers.get('accept-ranges');
    if (acceptRanges) headers['Accept-Ranges'] = acceptRanges;

    return new NextResponse(null, {
      status: response.status,
      headers,
    });
  } catch {
    return new NextResponse(null, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Range, Content-Type, Authorization',
      'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Content-Type, Accept-Ranges',
      'Access-Control-Max-Age': '86400',
    },
  });
}
