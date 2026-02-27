import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { getDb } from 'lib/server/db';

type CommentRow = {
  id: string;
  user_name: string;
  user_id: string;
  user_avata: string;
  text: string;
  timestamp: string;
  likes_json: string;
};

export async function GET(
  _: Request,
  { params }: { params: { movieId: string } }
) {
  try {
    const db = getDb();
    const rows = db
      .prepare(
        `
        SELECT id, user_name, user_id, user_avata, text, timestamp, likes_json
        FROM comments
        WHERE movie_id = ?
        ORDER BY rowid DESC
      `
      )
      .all(String(params.movieId)) as CommentRow[];

    const comments = rows.map((row) => ({
      id: row.id,
      userName: row.user_name,
      userId: row.user_id,
      userAvata: row.user_avata,
      text: row.text,
      timeStamp: row.timestamp,
      likes: JSON.parse(row.likes_json || '[]'),
    }));

    return NextResponse.json({ comments }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || 'Failed to fetch comments' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: { movieId: string } }
) {
  try {
    const payload = await request.json();
    const id = randomUUID();

    const comment = {
      id,
      userName: payload.userName,
      userId: payload.userId,
      userAvata: payload.userAvata || '',
      text: payload.text,
      timeStamp: payload.timeStamp || new Date().toISOString(),
      likes: Array.isArray(payload.likes) ? payload.likes : [],
    };

    const db = getDb();
    db.prepare(
      `
      INSERT INTO comments (id, movie_id, user_name, user_id, user_avata, text, timestamp, likes_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `
    ).run(
      comment.id,
      String(params.movieId),
      comment.userName,
      comment.userId,
      comment.userAvata,
      comment.text,
      comment.timeStamp,
      JSON.stringify(comment.likes)
    );

    return NextResponse.json({ comment }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || 'Failed to add comment' },
      { status: 500 }
    );
  }
}

