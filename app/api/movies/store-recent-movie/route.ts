import { NextRequest, NextResponse } from 'next/server';
import { getDb } from 'lib/server/db';

export async function POST(request: NextRequest) {
  const textData = await request.text();
  const data = JSON.parse(textData || '{}');

  const { userId, ...movie } = data;

  try {
    if (!userId || !movie?.id) {
      return NextResponse.json({ message: 'invalid payload' }, { status: 400 });
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
    ).run(String(userId), String(movie.id), JSON.stringify(movie), now);

    return NextResponse.json({ message: 'success' }, { status: 200 });
  } catch (error: any) {
    console.error(error.message);
    return NextResponse.json({ message: 'error' }, { status: 500 });
  }
}
