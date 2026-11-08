import { Pool } from 'pg';
import { PgStore, SCHEMA_PG_SQL } from './pg.js';
import { runStoreParitySuite } from './parity-suite.js';
import type { DataStore } from './types.js';

/**
 * Opt-in: the SAME parity suite against a REAL Postgres (not pg-mem), for the
 * deployed dialect. Skipped unless TEST_PG_CONNECTION_STRING points at a
 * disposable database, e.g.:
 *
 *   docker run -d --rm --name tet-pg -e POSTGRES_USER=tet \
 *     -e POSTGRES_PASSWORD=tet -e POSTGRES_DB=tet -p 15432:5432 postgres:16-alpine
 *   TEST_PG_CONNECTION_STRING=postgres://tet:tet@127.0.0.1:15432/tet pnpm --filter tet-server test
 *
 * Each test starts from a wiped schema (TRUNCATE ... RESTART IDENTITY), so the
 * suite's fresh-store assumptions hold. PgStore's own idempotent first-use
 * migration applies the DDL — exactly what a fresh AlloyDB sees on boot.
 */

const TABLES =
  'users, sessions, invites, progress, quiz_attempts, exam_attempts, card_states, card_reviews, exam_drafts';

async function makeRealPgStore(): Promise<DataStore> {
  const pool = new Pool({ connectionString: process.env.TEST_PG_CONNECTION_STRING });
  await pool.query(SCHEMA_PG_SQL); // ensure the tables exist for TRUNCATE
  await pool.query(`TRUNCATE ${TABLES} RESTART IDENTITY CASCADE`);
  return new PgStore(pool);
}

runStoreParitySuite(
  [['pg (real Postgres)', makeRealPgStore]],
  { skip: !process.env.TEST_PG_CONNECTION_STRING },
);
