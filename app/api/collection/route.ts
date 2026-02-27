import { NextResponse } from 'next/server';
import { getDb } from 'lib/server/db';

type CollectionRow = {
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
        'SELECT movie_json FROM collections WHERE user_id = ? ORDER BY datetime(created_at) DESC'
      )
      .all(userId) as CollectionRow[];

    const movies = rows.map((row) => JSON.parse(row.movie_json));
    return NextResponse.json({ movies }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || 'Failed to fetch collection' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { userId, movie } = await request.json();

    if (!userId || !movie?.id) {
      return NextResponse.json({ message: 'userId and movie are required' }, { status: 400 });
    }

    const db = getDb();
    const now = new Date().toISOString();

    db.prepare(
      `
      INSERT INTO collections (user_id, movie_id, movie_json, created_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(user_id, movie_id) DO UPDATE SET
        movie_json = excluded.movie_json,
        created_at = excluded.created_at
    `
    ).run(String(userId), String(movie.id), JSON.stringify(movie), now);

    return NextResponse.json({ message: 'success' }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message || 'Failed to add movie' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { userId, movieId } = await request.json();

    if (!userId || !movieId) {
      return NextResponse.json({ message: 'userId and movieId are required' }, { status: 400 });
    }

    const db = getDb();
    db.prepare('DELETE FROM collections WHERE user_id = ? AND movie_id = ?').run(
      String(userId),
      String(movieId)
    );

    return NextResponse.json({ message: 'success' }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || 'Failed to remove movie' },
      { status: 500 }
    );
  }
}

