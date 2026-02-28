import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';

const resolveDbPath = () => {
  if (process.env.SQLITE_DB_PATH) {
    return process.env.SQLITE_DB_PATH;
  }

  if (process.env.VERCEL) {
    return path.join('/tmp', 'flixnest.sqlite');
  }

  return path.join(process.cwd(), 'data', 'flixnest.sqlite');
};

const DB_PATH = resolveDbPath();

type GlobalWithDb = typeof globalThis & {
  __flixnestDb?: Database.Database;
};

const globalWithDb = globalThis as GlobalWithDb;

function initialize(db: Database.Database) {
  db.pragma('journal_mode = WAL');

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      photo TEXT NOT NULL DEFAULT '',
      password_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS collections (
      user_id TEXT NOT NULL,
      movie_id TEXT NOT NULL,
      movie_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      PRIMARY KEY (user_id, movie_id)
    );

    CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY,
      movie_id TEXT NOT NULL,
      user_name TEXT NOT NULL,
      user_id TEXT NOT NULL,
      user_avata TEXT NOT NULL DEFAULT '',
      text TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      likes_json TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      user_created_name TEXT NOT NULL,
      user_created_id TEXT NOT NULL,
      user_recive_name TEXT NOT NULL,
      user_recive_id TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      movie_slug TEXT NOT NULL,
      movie_id TEXT NOT NULL,
      read INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS recent_movies (
      user_id TEXT NOT NULL,
      movie_id TEXT NOT NULL,
      movie_json TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (user_id, movie_id)
    );
  `);
}

export function getDb() {
  if (!globalWithDb.__flixnestDb) {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    globalWithDb.__flixnestDb = new Database(DB_PATH);
    initialize(globalWithDb.__flixnestDb);
  }

  return globalWithDb.__flixnestDb;
}
