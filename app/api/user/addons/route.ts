import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth-utils';
import { createId, updateDb } from '@/lib/local-db';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { addons } = await req.json();

    if (!Array.isArray(addons)) {
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
    }

    await updateDb((db) => {
      const remaining = db.addons.filter((item) => item.userId !== user.userId);
      const nextAddons = addons.map((addon: any) => ({
        id: createId(),
        addonId: addon.id,
        name: addon.name,
        manifest: addon.manifest,
        version: addon.version,
        description: addon.description,
        types: Array.isArray(addon.types) ? addon.types : [],
        catalogs: Array.isArray(addon.catalogs) ? addon.catalogs : [],
        resources: Array.isArray(addon.resources) ? addon.resources : [],
        isActive: true,
        userId: user.userId,
      }));

      return { db: { ...db, addons: [...remaining, ...nextAddons] }, result: true };
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Sync addons error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
