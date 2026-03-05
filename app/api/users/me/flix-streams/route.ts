import { NextResponse } from 'next/server';
import { getDb } from 'lib/server/db';
import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.FLIX_STREAMS_ENCRYPTION_KEY || '12345678901234567890123456789012'; // 32 bytes for aes-256-cbc
const IV_LENGTH = 16;

function encrypt(text: string): string {
  if (!text) return '';
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decrypt(text: string): string {
  if (!text) return '';
  try {
    const textParts = text.split(':');
    const iv = Buffer.from(textParts.shift()!, 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (e) {
    console.error('Failed to decrypt URL', e);
    return '';
  }
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ message: 'userId is required' }, { status: 400 });
    }

    const db = getDb();
    const user = db.prepare('SELECT flix_streams_addon_url FROM users WHERE id = ?').get(String(userId)) as { flix_streams_addon_url: string | null } | undefined;

    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    const decryptedUrl = decrypt(user.flix_streams_addon_url || '');

    return NextResponse.json({ addonUrl: decryptedUrl }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message || 'Something went wrong' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { userId, addonUrl } = await request.json();

    if (!userId) {
      return NextResponse.json({ message: 'userId is required' }, { status: 400 });
    }

    const encryptedUrl = encrypt(addonUrl || '');

    const db = getDb();
    db.prepare('UPDATE users SET flix_streams_addon_url = ? WHERE id = ?').run(
      encryptedUrl,
      String(userId)
    );

    return NextResponse.json({ message: 'Settings saved successfully' }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message || 'Something went wrong' }, { status: 500 });
  }
}
