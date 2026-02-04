import { NextResponse } from 'next/server';

const TRAKT_API = 'https://api.trakt.tv';

type TraktIds = {
  trakt?: number;
  imdb?: string;
  tmdb?: number;
  slug?: string;
};

type TraktMovie = {
  movie: {
    title?: string;
    ids: TraktIds;
  };
};

type TraktShow = {
  show: {
    title?: string;
    ids: TraktIds;
  };
};

const getClientId = () =>
  process.env.TRAKT_CLIENT_ID ?? process.env.NEXT_PUBLIC_TRAKT_CLIENT_ID;

const getHeaders = (token: string) => ({
  'Content-Type': 'application/json',
  'trakt-api-version': '2',
  'trakt-api-key': getClientId() ?? '',
  'Authorization': `Bearer ${token}`,
});

export async function POST(request: Request) {
  const { accessToken } = await request.json();
  const clientId = getClientId();

  if (!clientId) {
    return NextResponse.json(
      { error: 'Missing TRAKT_CLIENT_ID' },
      { status: 500 }
    );
  }

  if (!accessToken) {
    return NextResponse.json(
      { error: 'Missing access token' },
      { status: 400 }
    );
  }

  const headers = getHeaders(accessToken);

  try {
    const [
      watchlistMovies,
      watchlistShows,
      historyMovies,
      historyShows,
    ] = await Promise.all([
      fetch(`${TRAKT_API}/sync/watchlist/movies`, { headers }),
      fetch(`${TRAKT_API}/sync/watchlist/shows`, { headers }),
      fetch(`${TRAKT_API}/sync/history/movies`, { headers }),
      fetch(`${TRAKT_API}/sync/history/shows`, { headers }),
    ]);

    const [watchlistMoviesData, watchlistShowsData, historyMoviesData, historyShowsData] =
      await Promise.all([
        watchlistMovies.json() as Promise<TraktMovie[]>,
        watchlistShows.json() as Promise<TraktShow[]>,
        historyMovies.json() as Promise<TraktMovie[]>,
        historyShows.json() as Promise<TraktShow[]>,
      ]);

    return NextResponse.json({
      watchlist: {
        movies: watchlistMoviesData ?? [],
        shows: watchlistShowsData ?? [],
      },
      history: {
        movies: historyMoviesData ?? [],
        shows: historyShowsData ?? [],
      },
    });
  } catch (error) {
    console.error('Trakt catalog fetch failed:', error);
    return NextResponse.json({ error: 'Failed to fetch Trakt data' }, { status: 500 });
  }
}
