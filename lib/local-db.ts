import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

export interface DbUser {
  id: string;
  email: string;
  password: string;
  createdAt: number;
  updatedAt: number;
}

export interface DbAddon {
  id: string;
  addonId: string;
  name: string;
  manifest: string;
  version: string;
  description?: string;
  types: string[];
  catalogs: string[];
  resources: string[];
  isActive: boolean;
  userId: string;
}

export interface DbWatchlistItem {
  id: string;
  mediaId: string;
  type: string;
  title: string;
  poster: string;
  backdrop?: string;
  addedAt: number;
  userId: string;
}

export interface DbHistoryItem {
  id: string;
  mediaId: string;
  type: string;
  title: string;
  poster: string;
  backdrop?: string;
  season?: number;
  episode?: number;
  episodeTitle?: string;
  progress: number;
  duration: number;
  lastWatchedAt: number;
  watchedEpisodes?: Record<string, boolean>;
  userId: string;
}

export interface LocalDb {
  users: DbUser[];
  addons: DbAddon[];
  watchlist: DbWatchlistItem[];
  history: DbHistoryItem[];
}

// In serverless environments (Lambda, Vercel), /var/task is read-only
// Use /tmp for writable storage, otherwise use process.cwd()
const getDbPath = () => {
  const isServerless = process.env.LAMBDA_TASK_ROOT || process.env.VERCEL;
  if (isServerless) {
    return path.resolve('/tmp', 'data', 'db.json');
  }
  return path.resolve(process.cwd(), 'data', 'db.json');
};

const DB_FILE = getDbPath();
const EMPTY_DB: LocalDb = {
  users: [],
  addons: [],
  watchlist: [],
  history: [],
};

const ensureDbShape = (data: Partial<LocalDb> | null): LocalDb => ({
  users: Array.isArray(data?.users) ? data!.users : [],
  addons: Array.isArray(data?.addons) ? data!.addons : [],
  watchlist: Array.isArray(data?.watchlist) ? data!.watchlist : [],
  history: Array.isArray(data?.history) ? data!.history : [],
});

const ensureDbFile = async () => {
  await fs.mkdir(path.dirname(DB_FILE), { recursive: true });
};

const readDbInternal = async (): Promise<LocalDb> => {
  try {
    const raw = await fs.readFile(DB_FILE, 'utf8');
    return ensureDbShape(JSON.parse(raw));
  } catch (error: any) {
    if (error?.code !== 'ENOENT') {
      console.error('Local DB read error:', error);
    }
    await ensureDbFile();
    await fs.writeFile(DB_FILE, JSON.stringify(EMPTY_DB, null, 2), 'utf8');
    return { ...EMPTY_DB };
  }
};

const writeDbInternal = async (db: LocalDb) => {
  await ensureDbFile();
  await fs.writeFile(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
};

let writeQueue = Promise.resolve();

export const updateDb = async <T>(
  updater: (db: LocalDb) => Promise<{ db: LocalDb; result: T }> | { db: LocalDb; result: T }
): Promise<T> => {
  let result: T;
  writeQueue = writeQueue.then(async () => {
    const db = await readDbInternal();
    const { db: nextDb, result: nextResult } = await updater(db);
    await writeDbInternal(nextDb);
    result = nextResult;
  });
  await writeQueue;
  return result!;
};

export const getDb = async (): Promise<LocalDb> => {
  await writeQueue;
  return readDbInternal();
};

export const createId = (): string =>
  typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

export const normalizeEmail = (email: string): string => email.trim().toLowerCase();
