import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { getDb } from 'lib/server/db';
import { verifyPassword } from 'lib/server/password';

type UserRow = {
  id: string;
  email: string;
  name: string;
  photo: string;
  password_hash: string;
  salt: string;
  created_at: string;
};

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { code: 'auth/invalid-credential', message: 'Email and password are required' },
        { status: 400 }
      );
    }

    const db = getDb();
    const normalizedEmail = String(email).toLowerCase().trim();
    const user = db
      .prepare(
        `
        SELECT id, email, name, photo, password_hash, salt, created_at
        FROM users
        WHERE email = ?
      `
      )
      .get(normalizedEmail) as UserRow | undefined;

    if (!user || !verifyPassword(String(password), user.salt, user.password_hash)) {
      return NextResponse.json(
        { code: 'auth/invalid-credential', message: 'Invalid email or password' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          photo: user.photo,
          createdAt: user.created_at,
          accessToken: randomUUID(),
          refreshToken: randomUUID(),
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

