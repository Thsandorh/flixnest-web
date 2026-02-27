import { NextRequest } from 'next/server';

function buildProxyUrl(request: NextRequest, targetUrl: string) {
  const proxyUrl = new URL('/api/media/playlist', request.nextUrl.origin);
  proxyUrl.searchParams.set('url', targetUrl);
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
      rewritten.push(rewriteTagUri(rawLine, playlistUrl, request, (absoluteUrl) => absoluteUrl));
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
      rewritten.push(absoluteUrl);
      expectSegmentUri = false;
      continue;
    }

    rewritten.push(absoluteUrl);
  }

  return rewritten.join('\n');
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

  const upstreamResponse = await fetch(parsedUrl.toString(), {
    method: 'GET',
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      Accept: 'application/vnd.apple.mpegurl, application/x-mpegURL, */*',
    },
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
