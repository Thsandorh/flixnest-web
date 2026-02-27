import { NextResponse } from 'next/server';
import { getDb } from 'lib/server/db';

type RecentRow = {
  movie_json: string;
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    if (!userId) {
      return NextResponse.json({ message: 'userId is required' }, { status: 400 });
    }

    const db = getDb();
    const rows = db
      .prepare(
        `
        SELECT movie_json
        FROM recent_movies
        WHERE user_id = ?
        ORDER BY datetime(updated_at) DESC
      `
      )
      .all(String(userId)) as RecentRow[];

    const movies = rows.map((row) => JSON.parse(row.movie_json));
    return NextResponse.json({ movies }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || 'Failed to fetch recent movies' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { userId, recentMovie } = await request.json();
    if (!userId || !recentMovie?.id) {
      return NextResponse.json(
        { message: 'userId and recentMovie are required' },
        { status: 400 }
      );
    }

    const db = getDb();
    const now = new Date().toISOString();

    db.prepare(
      `
      INSERT INTO recent_movies (user_id, movie_id, movie_json, updated_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(user_id, movie_id) DO UPDATE SET
        movie_json = excluded.movie_json,
        updated_at = excluded.updated_at
    `
    ).run(String(userId), String(recentMovie.id), JSON.stringify(recentMovie), now);

    return NextResponse.json({ message: 'success' }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || 'Failed to save recent movie' },
      { status: 500 }
    );
  }
}

