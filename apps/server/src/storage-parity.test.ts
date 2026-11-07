import { describe, expect, it } from 'vitest';
import { serve } from '@hono/node-server';
import { openDb, type DB } from './db.js';
import { createApp } from './index.js';
import { createServerAdapter, runParitySuite } from 'tet-storage';

async function startServer(): Promise<{ url: string; db: DB; close: () => Promise<void> }> {
  const db = openDb(':memory:');
  const app = createApp(db);
  const server = serve({ fetch: app.fetch, port: 0 });
  const addr = server.address();
  const port = typeof addr === 'object' && addr ? addr.port : 0;
  return { url: `http://127.0.0.1:${port}`, db, close: () => new Promise((res) => server.close(() => res())) };
}

/** Minimal cookie jar over fetch so browser-style credentials work in Node. */
function jarFetch(baseUrl: string): { fetchLike: typeof fetch; cookie: () => string } {
  let stored = '';
  const fetchLike: typeof fetch = async (input, init = {}) => {
    const headers = new Headers(init.headers);
    if (stored) headers.set('cookie', stored);
    // The adapter hands us absolute URLs; resolve handles relative ones too.
    const res = await fetch(new URL(String(input), baseUrl), { ...init, headers });
    const setCookie = res.headers.get('set-cookie');
    if (setCookie) stored = setCookie.split(';')[0]!;
    return res;
  };
  return { fetchLike, cookie: () => stored };
}

/** Registers a user through `fetchLike` so the jar captures the session cookie. */
async function registerVia(fetchLike: typeof fetch, username: string): Promise<void> {
  const res = await fetchLike('/api/auth/register', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username, displayName: username, password: 'longenough1' }),
  });
  if (res.status !== 201) throw new Error(`register ${username} failed: ${res.status}`);
}

describe('ServerAdapter', () => {
  // Parity roundtrip semantics differ by adapter, and that is intentional:
  // - LocalAdapter's factory is `() => Promise.resolve(createLocalAdapter())`,
  //   which opens two connections to the SAME browser database (one
  //   fake-indexedDB factory per test). Its import assertions therefore verify
  //   merge-into-existing-store behavior.
  // - ServerAdapter's factory binds each call to a server it starts: the
  //   primary call registers one user on one server (same-user semantics —
  //   that is the contract being proven), and the SECONDARY call starts a
  //   FRESH server (new in-memory DB) with a DIFFERENT user, so the import
  //   assertions prove real data movement across users/stores.
  it('passes the parity suite against a real server', async () => {
    const servers: Array<{ url: string; db: DB; close: () => Promise<void> }> = [];
    try {
      const buildAdapter = async (which: 'primary' | 'secondary') => {
        const s = await startServer();
        servers.push(s);
        const { fetchLike } = jarFetch(s.url);
        await registerVia(fetchLike, which === 'primary' ? 'parity' : 'parity2');
        return createServerAdapter({ serverUrl: s.url, fetchLike });
      };
      await runParitySuite(buildAdapter);
    } finally {
      for (const s of servers) {
        s.db.close();
        await s.close();
      }
    }
  });

  it('buffers writes on 401 and flushes after re-auth (Review Focus #5)', async () => {
    const { url, db, close } = await startServer();
    try {
      const reg = await fetch(url + '/api/auth/register', { method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ username: 'user1', displayName: 'U1', password: 'longenough1' }) });
      const sessionCookie = (reg.headers.get('set-cookie') ?? '').split(';')[0]!;

      let token = sessionCookie.split('=')[1]!;
      const fetchLike: typeof fetch = async (input, init = {}) => {
        const headers = new Headers(init.headers);
        headers.set('cookie', `tet_session=${token}`);
        return fetch(new URL(String(input), url), { ...init, headers });
      };

      let reAuthCalls = 0;
      const adapter = createServerAdapter({
        serverUrl: url,
        fetchLike,
        onUnauthorized: async () => {
          reAuthCalls++;
          token = 'refreshtoken'; // simulate fresh login cookie
          await fetch(url + '/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ username: 'user1', password: 'longenough1' }) });
          // capture the new cookie
          const login = await fetch(url + '/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ username: 'user1', password: 'longenough1' }) });
          token = (login.headers.get('set-cookie') ?? '').split('=')[1]!.split(';')[0]!;
        },
      });

      // Kill the server-side session to force a 401 on the next write.
      db.prepare('DELETE FROM sessions').run();

      const draft = { examId: 'e1', responses: { q1: [0] }, flags: [], startedAt: '2026-11-07T00:00:00Z', remainingSec: 3000 };
      await adapter.putExamDraft(draft); // 401 → buffered, re-auth runs, replay succeeds

      expect(reAuthCalls).toBeGreaterThanOrEqual(1);
      const got = await adapter.getExamDraft('e1');
      expect(got).not.toBeNull();
      expect(got!.responses).toEqual({ q1: [0] });
    } finally {
      db.close();
      await close();
    }
  });
});
