import { beforeEach, describe, expect, it, vi } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import 'fake-indexeddb/auto';
import { createLocalAdapter } from './local.js';
import { runParitySuite } from './parity.js';

describe('LocalAdapter', () => {
  // A fresh IDBFactory per test → no cross-test database leakage, no delete race.
  beforeEach(() => {
    vi.stubGlobal('indexedDB', new IDBFactory());
  });

  it('passes the parity suite', async () => {
    await runParitySuite(() => Promise.resolve(createLocalAdapter()));
  });
});
