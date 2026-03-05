import { NextRequest } from 'next/server';
import { withBasePath } from 'utils/base-path';

const SERVICE_RETRY_DELAY_MS = 5_000;
const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const ALLOWED_PROXY_HEADER_NAMES = ['referer', 'origin', 'user-agent'] as const;

type AllowedProxyHeaderName = (typeof ALLOWED_PROXY_HEADER_NAMES)[number];
type AllowedProxyHeaders = Partial<Record<AllowedProxyHeaderName, string>>;

function buildProxyUrl(request: NextRequest, targetUrl: string) {
  const proxyUrl = new URL(withBasePath('/api/media/playlist'), request.nextUrl.origin);
  proxyUrl.searchParams.set('url', targetUrl);

  const rawHeaders = request.nextUrl.searchParams.get('headers');
  if (rawHeaders) {
    proxyUrl.searchParams.set('headers', rawHeaders);
  }

  return proxyUrl.toString();
}

function absolutizeUrl(candidate: string, baseUrl: string) {
  try {
    return new URL(candidate, baseUrl).toString();
  } catch {
    return candidate;
  }
}

function rewriteTagUri(
  line: string,
  baseUrl: string,
  request: NextRequest,
  transform: (absoluteUrl: string) => string
) {
  return line.replace(/URI="([^"]+)"/, (_match, uri) => {
    const absoluteUrl = absolutizeUrl(uri, baseUrl);
    return `URI="${transform(absoluteUrl)}"`;
  });
}

function rewritePlaylist(content: string, playlistUrl: string, request: NextRequest) {
  const lines = content.split('\n');
  const rewritten: string[] = [];
  let expectPlaylistUri = false;
  let expectSegmentUri = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      rewritten.push(rawLine);
      continue;
    }

    if (line.startsWith('#EXT-X-STREAM-INF')) {
      rewritten.push(rawLine);
      expectPlaylistUri = true;
      expectSegmentUri = false;
      continue;
    }

    if (line.startsWith('#EXTINF')) {
      rewritten.push(rawLine);
      expectSegmentUri = true;
      expectPlaylistUri = false;
      continue;
    }

    if (line.startsWith('#EXT-X-MEDIA') && rawLine.includes('URI="')) {
      rewritten.push(
        rewriteTagUri(rawLine, playlistUrl, request, (absoluteUrl) => buildProxyUrl(request, absoluteUrl))
      );
      continue;
    }

    if (line.startsWith('#EXT-X-I-FRAME-STREAM-INF') && rawLine.includes('URI="')) {
      rewritten.push(
        rewriteTagUri(rawLine, playlistUrl, request, (absoluteUrl) => buildProxyUrl(request, absoluteUrl))
      );
      continue;
    }

    if (line.startsWith('#EXT-X-KEY') && rawLine.includes('URI="')) {
      rewritten.push(
        rewriteTagUri(rawLine, playlistUrl, request, (absoluteUrl) => buildProxyUrl(request, absoluteUrl))
      );
      continue;
    }

    if (line.startsWith('#')) {
      rewritten.push(rawLine);
      continue;
    }

    const absoluteUrl = absolutizeUrl(line, playlistUrl);
    if (expectPlaylistUri) {
      rewritten.push(buildProxyUrl(request, absoluteUrl));
      expectPlaylistUri = false;
      continue;
    }

    if (expectSegmentUri) {
      rewritten.push(rawLine);
      expectSegmentUri = false;
      continue;
    }

    rewritten.push(rawLine);
  }

  return rewritten.join('\n');
}

async function fetchWith503Retry(input: string, init: RequestInit) {
  let response = await fetch(input, init);
  if (response.status !== 503) {
    return response;
  }

  await new Promise((resolve) => setTimeout(resolve, SERVICE_RETRY_DELAY_MS));
  response = await fetch(input, init);
  return response;
}

function parseForwardedHeaders(rawValue: string | null): AllowedProxyHeaders {
  if (!rawValue) return {};

  try {
    const parsed = JSON.parse(rawValue) as Record<string, unknown>;
    if (!parsed || typeof parsed !== 'object') return {};

    const sanitized: AllowedProxyHeaders = {};
    for (const headerName of ALLOWED_PROXY_HEADER_NAMES) {
      const value = parsed[headerName];
      if (typeof value === 'string' && value.trim()) {
        sanitized[headerName] = value.trim();
      }
    }

    return sanitized;
  } catch {
    return {};
  }
}

function isPlaylistResponse(contentType: string, url: URL) {
  const normalizedType = contentType.toLowerCase();
  return (
    normalizedType.includes('mpegurl') ||
    normalizedType.includes('application/x-mpegurl') ||
    normalizedType.includes('vnd.apple.mpegurl') ||
    normalizedType.startsWith('text/plain') ||
    url.pathname.toLowerCase().includes('.m3u8')
  );
}

export async function GET(request: NextRequest) {
  const upstreamUrl = request.nextUrl.searchParams.get('url');
  if (!upstreamUrl) {
    return new Response('Missing url', { status: 400 });
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(upstreamUrl);
  } catch {
    return new Response('Invalid url', { status: 400 });
  }

  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    return new Response('Unsupported protocol', { status: 400 });
  }

  const forwardedHeaders = parseForwardedHeaders(request.nextUrl.searchParams.get('headers'));
  const upstreamHeaders: Record<string, string> = {
    'User-Agent': forwardedHeaders['user-agent'] || DEFAULT_USER_AGENT,
    Accept: 'application/vnd.apple.mpegurl, application/x-mpegURL, */*',
  };

  if (forwardedHeaders.referer) {
    upstreamHeaders['Referer'] = forwardedHeaders.referer;
  }

  if (forwardedHeaders.origin) {
    upstreamHeaders['Origin'] = forwardedHeaders.origin;
  }

  const upstreamResponse = await fetchWith503Retry(parsedUrl.toString(), {
    method: 'GET',
    headers: upstreamHeaders,
    cache: 'no-store',
    redirect: 'follow',
  });

  const contentType = upstreamResponse.headers.get('content-type') || 'application/vnd.apple.mpegurl';
  if (!upstreamResponse.ok) {
    return new Response(await upstreamResponse.text(), {
      status: upstreamResponse.status,
      headers: {
        'content-type': contentType,
        'cache-control': 'no-store',
      },
    });
  }

  if (!isPlaylistResponse(contentType, parsedUrl)) {
    return new Response(await upstreamResponse.arrayBuffer(), {
      status: upstreamResponse.status,
      headers: {
        'content-type': contentType,
        'cache-control': 'no-store',
      },
    });
  }

  const playlistContent = await upstreamResponse.text();
  const rewritten = rewritePlaylist(playlistContent, parsedUrl.toString(), request);

  return new Response(rewritten, {
    status: upstreamResponse.status,
    headers: {
      'content-type': contentType,
      'cache-control': 'no-store',
    },
  });
}
