import { NextResponse } from 'next/server';
import { getDb } from 'lib/server/db';

type LikesRow = {
  likes_json: string;
};

function updateLikes(
  movieId: string,
  commentId: string,
  userId: string,
  mode: 'add' | 'remove'
) {
  const db = getDb();
  const row = db
    .prepare('SELECT likes_json FROM comments WHERE id = ? AND movie_id = ?')
    .get(commentId, movieId) as LikesRow | undefined;

  if (!row) {
    return null;
  }

  const likes = new Set<string>(JSON.parse(row.likes_json || '[]'));
  if (mode === 'add') {
    likes.add(userId);
  } else {
    likes.delete(userId);
  }

  const nextLikes = Array.from(likes);
  db.prepare('UPDATE comments SET likes_json = ? WHERE id = ? AND movie_id = ?').run(
    JSON.stringify(nextLikes),
    commentId,
    movieId
  );

  return nextLikes;
}

export async function POST(
  request: Request,
  { params }: { params: { movieId: string; commentId: string } }
) {
  try {
    const { userId } = await request.json();
    if (!userId) {
      return NextResponse.json({ message: 'userId is required' }, { status: 400 });
    }

    const likes = updateLikes(
      String(params.movieId),
      String(params.commentId),
      String(userId),
      'add'
    );

    if (!likes) {
      return NextResponse.json({ message: 'Comment not found' }, { status: 404 });
    }

    return NextResponse.json({ likes }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message || 'Failed to like comment' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { movieId: string; commentId: string } }
) {
  try {
    const { userId } = await request.json();
    if (!userId) {
      return NextResponse.json({ message: 'userId is required' }, { status: 400 });
    }

    const likes = updateLikes(
      String(params.movieId),
      String(params.commentId),
      String(userId),
      'remove'
    );

    if (!likes) {
      return NextResponse.json({ message: 'Comment not found' }, { status: 404 });
    }

    return NextResponse.json({ likes }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || 'Failed to unlike comment' },
      { status: 500 }
    );
  }
}

