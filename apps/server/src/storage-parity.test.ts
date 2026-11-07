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

/**
 * Adapter wired like the 401-buffering test below: requests carry the current
 * session cookie, `killSessions()` wipes the server-side sessions (the next
 * request 401s), and `onUnauthorized` logs back in and captures the fresh
 * cookie — so tests drive auth outages deterministically.
 */
async function authHarness(url: string, db: DB, username: string): Promise<{
  adapter: ReturnType<typeof createServerAdapter>;
  reAuthCalls: { count: number };
  killSessions: () => void;
}> {
  const reg = await fetch(url + '/api/auth/register', { method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username, displayName: username, password: 'longenough1' }) });
  const sessionCookie = (reg.headers.get('set-cookie') ?? '').split(';')[0]!;

  let token = sessionCookie.split('=')[1]!;
  const fetchLike: typeof fetch = async (input, init = {}) => {
    const headers = new Headers(init.headers);
    headers.set('cookie', `tet_session=${token}`);
    return fetch(new URL(String(input), url), { ...init, headers });
  };

  const reAuthCalls = { count: 0 };
  const adapter = createServerAdapter({
    serverUrl: url,
    fetchLike,
    onUnauthorized: async () => {
      reAuthCalls.count++;
      const login = await fetch(url + '/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ username, password: 'longenough1' }) });
      token = (login.headers.get('set-cookie') ?? '').split('=')[1]!.split(';')[0]!;
    },
  });
  return { adapter, reAuthCalls, killSessions: () => { db.prepare('DELETE FROM sessions').run(); } };
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

  it('sends a buffered write exactly once when exportAll drains concurrently', async () => {
    const { url, db, close } = await startServer();
    try {
      const { adapter, killSessions } = await authHarness(url, db, 'dupuser');
      killSessions();
      await adapter.recordCardReview({
        cardId: 'c1', grade: 'good',
        state: { ease: 2.5, intervalDays: 1, dueAt: '2026-11-08T00:00:00Z', reps: 1, lapses: 0 },
        createdAt: '2026-11-07T04:00:00Z',
      }); // 401 → buffered, re-auth runs

      await adapter.exportAll(); // four concurrent reads → must share ONE drain

      const states = await adapter.getReviewState();
      expect(states['c1']).toBeDefined(); // review present
      expect(states['c1']!.reps).toBe(1); // latest-wins state, not double-counted
      // The real duplication detector: the review audit log — one POST, one
      // row. card_states upserts absolute client-computed values, so reps
      // alone cannot expose duplicated sends.
      const row = db.prepare('SELECT COUNT(*) AS n FROM card_reviews WHERE card_id = ?').get('c1') as { n: number };
      expect(row.n).toBe(1);
    } finally {
      db.close();
      await close();
    }
  });

  it('replays buffered writes in submission order after re-auth (no stale overwrite)', async () => {
    const { url, db, close } = await startServer();
    try {
      const { adapter, killSessions } = await authHarness(url, db, 'orderuser');
      killSessions(); // outage cycle 1: v1 hits 401, buffers, re-auth runs
      await adapter.putExamDraft({ examId: 'e1', responses: { q1: [0] }, flags: [], startedAt: '2026-11-07T00:00:00Z', remainingSec: 1800 });

      killSessions(); // outage cycle 2: the refreshed cookie dies too, so the
      // drain inside the next write fails — v2 must queue BEHIND v1, never
      // leapfrog it to the same key.
      await adapter.putExamDraft({ examId: 'e1', responses: { q1: [1] }, flags: [], startedAt: '2026-11-07T00:00:00Z', remainingSec: 1700 });

      const got = await adapter.getExamDraft('e1'); // drain replays v1 then v2, then reads
      expect(got).not.toBeNull();
      expect(got!.responses).toEqual({ q1: [1] }); // NEWEST state wins
    } finally {
      db.close();
      await close();
    }
  });

  // Final-review regression (I4): the exam submits a learner made during an
  // expired window must reach the server through the SAME re-auth flow the UI
  // uses — a temp fetch login refreshing the cookie, the adapter instance NOT
  // replaced (connectCohort reuses it). If the buffer were orphaned by an
  // adapter swap, getExamAttempts would come back empty and the learner would
  // see "Report not found".
  it('drains exam submits buffered during an expired window via the UI re-auth path', async () => {
    const { url, db, close } = await startServer();
    try {
      const { adapter, reAuthCalls, killSessions } = await authHarness(url, db, 'uiuser');
      killSessions(); // expiry: next write 401s → onUnauthorized logs back in
      await adapter.recordExamAttempt({
        attemptId: 'a1', examId: 'e1', score: 2, max: 4, passed: true, scorePct: 50,
        perTag: { ch1: { correct: 1, total: 2 } }, responses: { q1: [0] },
        createdAt: '2026-11-07T00:00:00Z', durationSec: 600,
      }); // buffered, re-auth ran, adapter instance unchanged
      expect(adapter.pendingWrites?.()).toBe(1); // nothing lost, nothing delivered yet

      const got = await adapter.getExamAttempts('e1'); // next request drains the buffer first
      expect(reAuthCalls.count).toBeGreaterThanOrEqual(1);
      expect(got).toHaveLength(1);
      expect(got[0]!.attemptId).toBe('a1');
      expect(adapter.pendingWrites?.()).toBe(0);
    } finally {
      db.close();
      await close();
    }
  });
});
