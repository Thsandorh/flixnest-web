import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const url = searchParams.get('url');
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

    // Validate URL
    let targetUrl: URL;
    try {
      targetUrl = new URL(decodedUrl);
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL provided' },
        { status: 400 }
      );
    }

    // Prepare headers for the upstream request
    const upstreamHeaders: HeadersInit = {
      'User-Agent':
        uaParam ||
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': request.headers.get('accept') || '*/*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Referer': refererParam || targetUrl.origin,
    };

    // Forward Range header if present (for video seeking)
    const rangeHeader = request.headers.get('range');
    if (rangeHeader) {
      upstreamHeaders['Range'] = rangeHeader;
    }

    const response = await fetch(targetUrl.toString(), {
      method: 'GET',
      headers: upstreamHeaders,
    });

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
    } else if (contentType.includes('text/') || contentType.includes('application/x-mpegurl') || contentType.includes('application/vnd.apple.mpegurl')) {
      // Handle m3u8 playlists - need to proxy URLs inside them
      const text = await response.text();

      // If it's an m3u8 file, proxy the URLs inside
      if (decodedUrl.includes('.m3u8') || contentType.includes('mpegurl')) {
        const baseUrl = decodedUrl.substring(0, decodedUrl.lastIndexOf('/') + 1);

        // Helper to build an absolute URL and wrap it with our proxy
        const toProxiedUrl = (rawUrl: string) => {
          const cleaned = rawUrl.trim();

          // Skip special URI schemes (e.g., data:, skd:, urn:) but keep relative URLs
          if (cleaned.includes(':') && !/^https?:\/\//i.test(cleaned) && !cleaned.startsWith('//')) {
            return cleaned;
          }

          let absoluteUrl = cleaned;
          if (cleaned.startsWith('//')) {
            absoluteUrl = `https:${cleaned}`;
          } else if (!cleaned.startsWith('http://') && !cleaned.startsWith('https://')) {
            absoluteUrl = baseUrl + cleaned;
          }

          const params = new URLSearchParams();
          params.set('url', absoluteUrl);
          if (refererParam) params.set('referer', refererParam);
          if (uaParam) params.set('ua', uaParam);
          return `/api/proxy?${params.toString()}`;
        };

        const proxiedM3u8 = text
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

        return new NextResponse(proxiedM3u8, {
          status: response.status,
          headers: responseHeaders,
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
  const refererParam = searchParams.get('referer') || '';
  const uaParam = searchParams.get('ua') || '';

  if (!url) {
    return new NextResponse(null, { status: 400 });
  }

  try {
    const decodedUrl = decodeURIComponent(url);
    const response = await fetch(decodedUrl, {
      method: 'HEAD',
      headers: {
        'User-Agent':
          uaParam ||
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': refererParam || new URL(decodedUrl).origin,
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
