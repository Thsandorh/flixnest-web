import { NextResponse } from 'next/server';
import { getDb } from 'lib/server/db';

export async function POST(request: Request) {
  try {
    const { id, userReciveId } = await request.json();
    if (!id || !userReciveId) {
      return NextResponse.json({ message: 'id and userReciveId are required' }, { status: 400 });
    }

    const db = getDb();
    db.prepare('UPDATE notifications SET read = 1 WHERE id = ? AND user_recive_id = ?').run(
      String(id),
      String(userReciveId)
    );

    return NextResponse.json({ message: 'success' }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || 'Failed to mark notification as read' },
      { status: 500 }
    );
  }
}

