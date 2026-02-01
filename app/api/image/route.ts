import { NextRequest } from 'next/server';

const isPrivateIp = (hostname: string): boolean => {
  if (!/^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname)) {
    return false;
  }

  const parts = hostname.split('.').map((part) => Number(part));
  if (parts.some((part) => Number.isNaN(part) || part < 0 || part > 255)) {
    return true;
  }

  const [a, b] = parts;

  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 0) return true;

  return false;
};

const isBlockedHost = (hostname: string): boolean => {
  const lowered = hostname.toLowerCase();
  if (lowered === 'localhost' || lowered.endsWith('.local')) return true;
  if (isPrivateIp(lowered)) return true;
  return false;
};

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');

  if (!url) {
    return new Response('Missing url', { status: 400 });
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return new Response('Invalid url', { status: 400 });
  }

  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    return new Response('Invalid protocol', { status: 400 });
  }

  if (isBlockedHost(parsedUrl.hostname)) {
    return new Response('Blocked host', { status: 400 });
  }

  try {
    const response = await fetch(parsedUrl.toString(), {
      headers: {
        'User-Agent': 'FlixNest Image Proxy',
      },
    });

    if (!response.ok || !response.body) {
      return new Response('Failed to fetch image', { status: response.status || 502 });
    }

    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    const cacheControl =
      response.headers.get('cache-control') || 'public, max-age=3600, stale-while-revalidate=86400';

    return new Response(response.body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': cacheControl,
      },
    });
  } catch (error) {
    console.error('Image proxy error:', error);
    return new Response('Image proxy error', { status: 502 });
  }
}
