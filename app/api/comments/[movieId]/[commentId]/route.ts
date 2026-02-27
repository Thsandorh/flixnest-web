import { NextResponse } from 'next/server';
import { getDb } from 'lib/server/db';

export async function PATCH(
  request: Request,
  { params }: { params: { movieId: string; commentId: string } }
) {
  try {
    const { text } = await request.json();
    if (!text) {
      return NextResponse.json({ message: 'text is required' }, { status: 400 });
    }

    const db = getDb();
    db.prepare('UPDATE comments SET text = ? WHERE id = ? AND movie_id = ?').run(
      String(text),
      String(params.commentId),
      String(params.movieId)
    );

    return NextResponse.json({ message: 'success' }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || 'Failed to update comment' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _: Request,
  { params }: { params: { movieId: string; commentId: string } }
) {
  try {
    const db = getDb();
    db.prepare('DELETE FROM comments WHERE id = ? AND movie_id = ?').run(
      String(params.commentId),
      String(params.movieId)
    );
    return NextResponse.json({ message: 'success' }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || 'Failed to delete comment' },
      { status: 500 }
    );
  }
}

