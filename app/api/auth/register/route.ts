import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createId, normalizeEmail, updateDb } from '@/lib/local-db';

export const runtime = 'nodejs';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

export async function POST(req: Request) {
  console.log('Registration request received');
  try {
    let body: unknown = null;
    try {
      body = await req.json();
    } catch (parseError) {
      console.error('Registration body parse error:', parseError);
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const { email, password } = body as { email?: unknown; password?: unknown };
    console.log('Registration body:', { email: typeof email === 'string' ? email : undefined });

    if (typeof email !== 'string' || typeof password !== 'string') {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const normalizedEmail = normalizeEmail(email);

    const user = await updateDb((db) => {
      const exists = db.users.some(
        (u) => u.email.toLowerCase() === normalizedEmail
      );
      if (exists) {
        return { db, result: null };
      }

      const now = Date.now();
      const newUser = {
        id: createId(),
        email: normalizedEmail,
        password: hashedPassword,
        createdAt: now,
        updatedAt: now,
      };

      return { db: { ...db, users: [...db.users, newUser] }, result: newUser };
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 400 }
      );
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return NextResponse.json({
      token,
      user: {
        id: user.id,
        email: user.email,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed', message: 'Use POST with JSON { email, password }.' },
    { status: 405 }
  );
}
