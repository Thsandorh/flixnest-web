import { NextResponse } from 'next/server';
import { getDb } from 'lib/server/db';

type RecentProgressRow = {
  movie_json: string;
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const movieId = searchParams.get('movieId');

    if (!userId || !movieId) {
      return NextResponse.json({ status: false }, { status: 200 });
    }

    const db = getDb();
    const row = db
      .prepare('SELECT movie_json FROM recent_movies WHERE user_id = ? AND movie_id = ?')
      .get(String(userId), String(movieId)) as RecentProgressRow | undefined;

    if (!row) {
      return NextResponse.json({ status: false }, { status: 200 });
    }

    return NextResponse.json({ status: true, ...JSON.parse(row.movie_json) }, { status: 200 });
  } catch {
    return NextResponse.json({ status: false }, { status: 200 });
  }
}

