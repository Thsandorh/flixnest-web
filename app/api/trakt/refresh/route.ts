import { NextResponse } from 'next/server';

const TRAKT_API = 'https://api.trakt.tv';

export async function POST(request: Request) {
  const { refreshToken } = await request.json();
  const clientId = process.env.TRAKT_CLIENT_ID;
  const clientSecret = process.env.TRAKT_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { error: 'Missing Trakt client credentials' },
      { status: 500 }
    );
  }

  if (!refreshToken) {
    return NextResponse.json(
      { error: 'Missing refreshToken' },
      { status: 400 }
    );
  }

  const response = await fetch(`${TRAKT_API}/oauth/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
    }),
  });

  const data = await response.json();
  return NextResponse.json(data, { status: response.status });
}
