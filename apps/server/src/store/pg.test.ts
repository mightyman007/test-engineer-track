import { describe, expect, it } from 'vitest';
import { PgStore, SCHEMA_PG_SQL, createPgPool, resolvePgSsl } from './pg.js';
import type { PgPoolLike } from './pg.js';

describe('resolvePgSsl (the PGSSLMODE knob)', () => {
  it("'require' → TLS on with verification off (the platform recipe), 'disable' → ssl off", () => {
    expect(resolvePgSsl('require')).toEqual({ ssl: { rejectUnauthorized: false } });
    expect(resolvePgSsl('disable')).toEqual({ ssl: false });
  });

  it('absent or unrecognized → no ssl key (node-pg default, unchanged behavior)', () => {
    expect(resolvePgSsl(undefined)).toEqual({});
    expect(resolvePgSsl('')).toEqual({});
    expect(resolvePgSsl('prefer')).toEqual({});
    expect(resolvePgSsl('REQUIRE')).toEqual({}); // exact-match knob, like the other env gates
  });
});

describe('createPgPool PGSSLMODE wiring', () => {
  // pg-pool copies its config onto `pool.options`, so the resolved `ssl` is
  // observable without opening a connection.
  const optionsOf = (pool: PgPoolLike): Record<string, unknown> =>
    (pool as unknown as { options: Record<string, unknown> }).options;

  it('propagates the knob into the pool config', () => {
    expect(optionsOf(createPgPool({ PGHOST: 'h', PGSSLMODE: 'require' }).pool)).toMatchObject({ host: 'h', ssl: { rejectUnauthorized: false } });
    expect(optionsOf(createPgPool({ PGHOST: 'h', PGSSLMODE: 'disable' }).pool)).toMatchObject({ host: 'h', ssl: false });
  });

  it('leaves ssl unset when PGSSLMODE is absent or unrecognized', async () => {
    expect('ssl' in optionsOf(createPgPool({ PGHOST: 'h' }).pool)).toBe(false);
    expect('ssl' in optionsOf(createPgPool({ PGHOST: 'h', PGSSLMODE: 'prefer' }).pool)).toBe(false);
    await createPgPool({ PGHOST: 'h' }).pool.end?.(); // never connected; release the handle
  });
});

describe('PgStore raw() rejection → token invalidation', () => {
  /** Pool stub: the DDL migration succeeds, every later query dies. */
  function stubPool(error: Error): PgPoolLike {
    return {
      query: async (text: string) => {
        if (text === SCHEMA_PG_SQL) return { rows: [], rowCount: 0 };
        throw error;
      },
      connect: async () => { throw new Error('connect is not exercised by raw()'); },
    };
  }

  it('a rejected pool.query fires onConnectionError AND propagates', async () => {
    const boom = new Error('connection refused');
    let invalidated = 0;
    const store = new PgStore(stubPool(boom), { onConnectionError: () => { invalidated += 1; } });
    // The killer path from the review: a cached-but-rejected IAM token serves
    // rejections through raw() — the cache must drop, and the caller still
    // sees the failure (no swallowing).
    await expect(store.countUsers()).rejects.toBe(boom);
    expect(invalidated).toBe(1);
    await store.close();
  });

  it('a successful raw() does not invalidate', async () => {
    let invalidated = 0;
    const pool: PgPoolLike = {
      query: async () => ({ rows: [{ n: 3 }], rowCount: 1 }),
      connect: async () => { throw new Error('connect is not exercised by raw()'); },
    };
    const store = new PgStore(pool, { onConnectionError: () => { invalidated += 1; } });
    expect(await store.countUsers()).toBe(3);
    expect(invalidated).toBe(0);
    await store.close();
  });
});
