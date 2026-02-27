import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getDb } from 'lib/server/db';
import { hashPassword } from 'lib/server/password';

export async function POST(request: Request) {
  try {
    const { email, password, name } = await request.json();

    if (!email || !password || !name) {
      return NextResponse.json(
        { code: 'auth/invalid-credential', message: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { code: 'auth/weak-password', message: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    const db = getDb();
    const existing = db
      .prepare('SELECT id FROM users WHERE email = ?')
      .get(String(email).toLowerCase().trim()) as { id: string } | undefined;

    if (existing) {
      return NextResponse.json(
        { code: 'auth/email-already-in-use', message: 'Email already in use' },
        { status: 409 }
      );
    }

    const id = randomUUID();
    const createdAt = new Date().toISOString();
    const normalizedEmail = String(email).toLowerCase().trim();
    const { salt, hash } = hashPassword(String(password));

    db.prepare(
      `
      INSERT INTO users (id, email, name, photo, password_hash, salt, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `
    ).run(id, normalizedEmail, String(name).trim(), '', hash, salt, createdAt);

    return NextResponse.json(
      {
        user: {
          id,
          email: normalizedEmail,
          name: String(name).trim(),
          photo: '',
          createdAt,
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
