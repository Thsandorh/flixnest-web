import { NextResponse } from 'next/server';

const TRAKT_API = 'https://api.trakt.tv';

export async function POST() {
  const clientId = process.env.TRAKT_CLIENT_ID ?? process.env.NEXT_PUBLIC_TRAKT_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json(
      { error: 'Missing TRAKT_CLIENT_ID' },
      { status: 500 }
    );
  }

  const response = await fetch(`${TRAKT_API}/oauth/device/code`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'trakt-api-version': '2',
      'trakt-api-key': clientId,
    },
    body: JSON.stringify({ client_id: clientId }),
  });

  const data = await response.json();
  return NextResponse.json(data, { status: response.status });
}
