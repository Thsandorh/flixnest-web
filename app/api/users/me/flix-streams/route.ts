import { NextResponse } from 'next/server';
import { getDb } from 'lib/server/db';
import { decryptFlixStreamsAddonUrl, encryptFlixStreamsAddonUrl } from 'lib/server/flix-streams';

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

    const decryptedUrl = decryptFlixStreamsAddonUrl(user.flix_streams_addon_url || '');

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

    const encryptedUrl = encryptFlixStreamsAddonUrl(addonUrl || '');

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
