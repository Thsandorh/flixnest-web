import { NextResponse } from 'next/server';
import { getDb } from 'lib/server/db';

type UserRow = {
  id: string;
  email: string;
  name: string;
  photo: string;
  created_at: string;
};

export async function PATCH(request: Request) {
  try {
    const { userId, name, email, photo } = await request.json();

    if (!userId || !name || !email) {
      return NextResponse.json(
        { code: 'validation/error', message: 'userId, name and email are required' },
        { status: 400 }
      );
    }

    const db = getDb();
    const normalizedEmail = String(email).toLowerCase().trim();

    const emailConflict = db
      .prepare('SELECT id FROM users WHERE email = ? AND id != ?')
      .get(normalizedEmail, String(userId)) as { id: string } | undefined;

    if (emailConflict) {
      return NextResponse.json(
        { code: 'auth/email-already-in-use', message: 'Email already in use' },
        { status: 409 }
      );
    }

    db.prepare('UPDATE users SET name = ?, email = ?, photo = ? WHERE id = ?').run(
      String(name).trim(),
      normalizedEmail,
      String(photo || ''),
      String(userId)
    );

    const updatedUser = db
      .prepare('SELECT id, email, name, photo, created_at FROM users WHERE id = ?')
      .get(String(userId)) as UserRow | undefined;

    if (!updatedUser) {
      return NextResponse.json(
        { code: 'auth/user-not-found', message: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          name: updatedUser.name,
          photo: updatedUser.photo,
          createdAt: updatedUser.created_at,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        code: error.code || 'server/error',
        message: error.message || 'Something went wrong',
      },
      { status: 500 }
    );
  }
}

