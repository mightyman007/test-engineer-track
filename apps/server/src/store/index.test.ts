import { describe, expect, it } from 'vitest';
import { createStore, PgStore, SqliteStore } from './index.js';

/**
 * The env gate is the deploy contract: Dana injects PG* envs ONLY when the
 * app opted into the Postgres engine (project.toml). When PGHOST is absent —
 * local dev, self-host, the smoke suite — storage must stay file-backed
 * SQLite, exactly as before M7.
 */
describe('createStore env gating', () => {
  it('PGHOST absent → SQLite (in-memory here, so no file is created)', () => {
    const store = createStore({ DB_PATH: ':memory:' });
    expect(store).toBeInstanceOf(SqliteStore);
  });

  it('PGHOST absent with no DB_PATH → the file-backed default (unchanged M1 behavior)', () => {
    const store = createStore({});
    expect(store).toBeInstanceOf(SqliteStore);
  });

  it('PGHOST set → PgStore wired for IAM auth (no connection is opened yet)', async () => {
    const store = createStore({
      PGHOST: '10.1.2.3', PGPORT: '5432', PGDATABASE: 'tet', PGUSER: 'app',
    });
    expect(store).toBeInstanceOf(PgStore);
    await store.close(); // pool.end without ever connecting
  });

  it('PGHOST set but PGDATABASE/PGUSER missing → fail fast, naming the missing vars', () => {
    // Dana injects all four together; a half-set env would otherwise fail
    // obscurely at pool-connect on the first request.
    expect(() => createStore({ PGHOST: '10.1.2.3' })).toThrow(/PGDATABASE, PGUSER/);
    expect(() => createStore({ PGHOST: '10.1.2.3', PGUSER: 'app' })).toThrow(/PGDATABASE/);
    expect(() => createStore({ PGHOST: '10.1.2.3', PGDATABASE: 'tet' })).toThrow(/PGUSER/);
  });
});
