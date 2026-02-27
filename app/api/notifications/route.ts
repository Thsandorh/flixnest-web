import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { getDb } from 'lib/server/db';

type NotificationRow = {
  id: string;
  type: string;
  user_created_name: string;
  user_created_id: string;
  user_recive_name: string;
  user_recive_id: string;
  timestamp: string;
  movie_slug: string;
  movie_id: string;
  read: number;
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
        SELECT id, type, user_created_name, user_created_id, user_recive_name, user_recive_id,
               timestamp, movie_slug, movie_id, read
        FROM notifications
        WHERE user_recive_id = ?
        ORDER BY datetime(timestamp) DESC
      `
      )
      .all(String(userId)) as NotificationRow[];

    const notifications = rows.map((row) => ({
      id: row.id,
      type: row.type,
      userCreatedName: row.user_created_name,
      userCreatedId: row.user_created_id,
      userReciveName: row.user_recive_name,
      userReciveId: row.user_recive_id,
      timestamp: row.timestamp,
      movieSlug: row.movie_slug,
      movieId: row.movie_id,
      read: Boolean(row.read),
    }));

    return NextResponse.json({ notifications }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const id = randomUUID();

    const notification = {
      id,
      type: payload.type,
      userCreatedName: payload.userCreatedName,
      userCreatedId: payload.userCreatedId,
      userReciveName: payload.userReciveName,
      userReciveId: payload.userReciveId,
      timestamp: payload.timestamp || new Date().toISOString(),
      movieSlug: payload.movieSlug,
      movieId: payload.movieId,
      read: Boolean(payload.read),
    };

    const db = getDb();
    db.prepare(
      `
      INSERT INTO notifications (
        id, type, user_created_name, user_created_id, user_recive_name, user_recive_id,
        timestamp, movie_slug, movie_id, read
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
    ).run(
      notification.id,
      notification.type,
      notification.userCreatedName,
      notification.userCreatedId,
      notification.userReciveName,
      notification.userReciveId,
      notification.timestamp,
      notification.movieSlug,
      notification.movieId,
      notification.read ? 1 : 0
    );

    return NextResponse.json({ notification }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || 'Failed to create notification' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { userReciveId, userCreatedId } = await request.json();
    if (!userReciveId || !userCreatedId) {
      return NextResponse.json(
        { message: 'userReciveId and userCreatedId are required' },
        { status: 400 }
      );
    }

    const db = getDb();
    const target = db
      .prepare(
        `
        SELECT id
        FROM notifications
        WHERE user_recive_id = ? AND user_created_id = ?
        ORDER BY datetime(timestamp) DESC
        LIMIT 1
      `
      )
      .get(String(userReciveId), String(userCreatedId)) as { id: string } | undefined;

    if (!target) {
      return NextResponse.json({ message: 'success' }, { status: 200 });
    }

    db.prepare('DELETE FROM notifications WHERE id = ?').run(target.id);
    return NextResponse.json({ message: 'success' }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || 'Failed to delete notification' },
      { status: 500 }
    );
  }
}

