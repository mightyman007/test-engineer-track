import { openDb } from '../db.js';
import { PgStore, createPgPool } from './pg.js';
import { SqliteStore } from './sqlite.js';
import type { DataStore } from './types.js';

export type { DataStore } from './types.js';
export { PgStore, createPgPool } from './pg.js';
export { SqliteStore } from './sqlite.js';
export { fetchIamToken, createIamTokenProvider } from './iamToken.js';

/**
 * Storage selection (M7):
 * - Dana deployment with the Postgres engine enabled injects PGHOST (plus
 *   PGPORT/PGDATABASE/PGUSER, IAM-token auth) → PgStore against the platform's
 *   managed AlloyDB.
 * - Any environment WITHOUT PGHOST — local dev, self-host, the smoke suite —
 *   keeps the file-backed SQLite store, byte-for-byte the M1..M6 behavior.
 * The env gate is mandatory: if the deployment's Postgres engine is off, Dana
 * deploys fine but injects no PG* envs.
 */
export function createStore(env: NodeJS.ProcessEnv = process.env): DataStore {
  if (env.PGHOST) {
    const { pool, invalidateToken } = createPgPool(env);
    return new PgStore(pool, { onConnectionError: invalidateToken });
  }
  return new SqliteStore(openDb(env.DB_PATH ?? './data/tet.sqlite3'));
}
