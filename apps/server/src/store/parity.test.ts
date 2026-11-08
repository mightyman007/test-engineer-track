import { newDb } from 'pg-mem';
import { openDb } from '../db.js';
import { PgStore } from './pg.js';
import { SqliteStore } from './sqlite.js';
import { runStoreParitySuite } from './parity-suite.js';
import type { DataStore } from './types.js';

/**
 * M7 storage parity: the SAME behavioral suite drives both DataStore drivers.
 * SqliteStore is the production local path (better-sqlite3, in-memory here);
 * PgStore runs against pg-mem's in-memory Postgres through the exact SQL and
 * the exact schema.pg.sql the deployed server uses. A real-Postgres variant
 * of this suite lives in parity.realpg.test.ts (opt-in).
 */

function makeSqliteStore(): DataStore {
  return new SqliteStore(openDb(':memory:'));
}

function makePgStore(): DataStore {
  const mem = newDb();
  const { Pool } = mem.adapters.createPg();
  return new PgStore(new Pool());
}

runStoreParitySuite([
  ['sqlite', makeSqliteStore],
  ['pg (pg-mem)', makePgStore],
]);
