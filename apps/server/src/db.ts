import Database from 'better-sqlite3';
import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export type DB = Database.Database;

export const SCHEMA_SQL = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), 'schema.sql'), 'utf8');

export function openDb(path: string): DB {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
  const db = new Database(path);
  db.pragma('journal_mode = WAL');
  db.exec(SCHEMA_SQL);
  // M6 SSO: identity columns on users (idempotent ALTERs for existing DBs).
  for (const col of ['identity_id TEXT', 'email TEXT', 'auth_provider TEXT NOT NULL DEFAULT \'local\'']) {
    try { db.exec(`ALTER TABLE users ADD COLUMN ${col}`); } catch { /* column exists */ }
  }
  try { db.exec('CREATE UNIQUE INDEX IF NOT EXISTS users_identity_id ON users (identity_id) WHERE identity_id IS NOT NULL'); } catch { /* exists */ }
  return db;
}
