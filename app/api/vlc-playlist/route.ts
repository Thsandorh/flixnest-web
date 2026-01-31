import { NextRequest, NextResponse } from 'next/server';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function toAbsoluteUrl(origin: string, url: string): string {
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  if (url.startsWith('/')) {
    return `${origin}${url}`;
  }
  return `${origin}/${url}`;
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const stream = searchParams.get('stream');

  if (!stream) {
    return NextResponse.json({ error: 'Missing stream parameter' }, { status: 400, headers: CORS_HEADERS });
  }

  const origin = request.nextUrl.origin;
  const subtitleParams = searchParams.getAll('sub');

  const streamUrl = toAbsoluteUrl(origin, stream);
  const subtitleUrls = subtitleParams
    .filter(Boolean)
    .map((sub) => toAbsoluteUrl(origin, sub));

  const playlistLines = ['#EXTM3U'];

  if (subtitleUrls.length > 0) {
    const inputSlave = subtitleUrls.join('#');
    playlistLines.push(`#EXTVLCOPT:input-slave=${inputSlave}`);
  }

  playlistLines.push('#EXTINF:-1,FlixNest');
  playlistLines.push(streamUrl);

  return new NextResponse(playlistLines.join('\n'), {
    status: 200,
    headers: {
      ...CORS_HEADERS,
      'Content-Type': 'audio/x-mpegurl; charset=utf-8',
    },
  });
}
