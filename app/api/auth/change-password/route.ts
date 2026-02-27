import { NextResponse } from 'next/server';
import { getDb } from 'lib/server/db';
import { hashPassword, verifyPassword } from 'lib/server/password';

type PasswordRow = {
  password_hash: string;
  salt: string;
};

export async function POST(request: Request) {
  try {
    const { userId, currentPassword, newPassword } = await request.json();

    if (!userId || !currentPassword || !newPassword) {
      return NextResponse.json(
        { code: 'auth/invalid-credential', message: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (String(newPassword).length < 6) {
      return NextResponse.json(
        { code: 'auth/weak-password', message: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    const db = getDb();
    const user = db
      .prepare('SELECT password_hash, salt FROM users WHERE id = ?')
      .get(String(userId)) as PasswordRow | undefined;

    if (!user) {
      return NextResponse.json(
        { code: 'auth/user-not-found', message: 'User not found' },
        { status: 404 }
      );
    }

    const validCurrentPassword = verifyPassword(
      String(currentPassword),
      user.salt,
      user.password_hash
    );

    if (!validCurrentPassword) {
      return NextResponse.json(
        { code: 'auth/invalid-credential', message: 'Current password is invalid' },
        { status: 401 }
      );
    }

    const { salt, hash } = hashPassword(String(newPassword));
    db.prepare('UPDATE users SET password_hash = ?, salt = ? WHERE id = ?').run(
      hash,
      salt,
      String(userId)
    );

    return NextResponse.json({ message: 'Password updated successfully' }, { status: 200 });
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

