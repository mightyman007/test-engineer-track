import { describe, expect, it, beforeEach } from 'vitest';
import { openDb, type DB } from '../db.js';
import { SqliteStore } from '../store/index.js';
import { createApp } from '../index.js';
import type { Hono } from 'hono';
import type { AppEnv } from '../auth.js';

let db: DB;
let app: Hono<AppEnv>;
let cookie: string;

beforeEach(async () => {
  db = openDb(':memory:');
  app = createApp(new SqliteStore(db));
  const res = await app.request('/api/auth/register', { method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username: 'admin', displayName: 'A', password: 'longenough1' }) });
  cookie = (res.headers.get('set-cookie') ?? '').split(';')[0]!;
});

function post(path: string, body: unknown) {
  return app.request(path, { method: 'POST', headers: { 'content-type': 'application/json', cookie },
    body: JSON.stringify(body) });
}

describe('progress', () => {
  it('roundtrips entries', async () => {
    const put = await app.request('/api/progress', { method: 'PUT',
      headers: { 'content-type': 'application/json', cookie },
      body: JSON.stringify({ entries: [{ track: 't1', module: 'm1', itemId: 'l1', status: 'done', updatedAt: '2026-11-07T00:00:00Z' }] }) });
    expect(put.status).toBe(204);
    const get = await app.request('/api/progress', { headers: { cookie } });
    const map = await get.json() as Record<string, { status: string }>;
    expect(map['t1/m1/l1']!.status).toBe('done');
  });
});

describe('attempts', () => {
  it('records a quiz attempt and reports idempotency on duplicate', async () => {
    const attempt = { attemptId: 'qa1', module: 'm1', score: 9, max: 10,
      perQuestion: { q1: true }, createdAt: '2026-11-07T01:00:00Z' };
    const first = await post('/api/attempts/quiz', attempt);
    expect(first.status).toBe(200);
    expect(await first.json() as { duplicate: boolean }).toEqual({ duplicate: false });

    const dup = await post('/api/attempts/quiz', attempt); // Review Focus #3
    expect(dup.status).toBe(200);
    expect(await dup.json() as { duplicate: boolean }).toEqual({ duplicate: true });

    const list = await app.request('/api/attempts/quiz?module=m1', { headers: { cookie } });
    expect((await list.json() as unknown[])).toHaveLength(1);
  });

  it('records an exam attempt with per-tag breakdown', async () => {
    const attempt = { attemptId: 'ea1', examId: 'e1', score: 30, max: 40, passed: true, scorePct: 75,
      perTag: { ch1: { correct: 7, total: 8 } }, responses: { q1: [0] },
      createdAt: '2026-11-07T02:00:00Z', durationSec: 1800 };
    const res = await post('/api/attempts/exam', attempt);
    expect(res.status).toBe(200);
    const list = await app.request('/api/attempts/exam?examId=e1', { headers: { cookie } });
    const rows = await list.json() as Array<{ scorePct: number }>;
    expect(rows[0]!.scorePct).toBe(75);
  });

  it('requires auth', async () => {
    const res = await app.request('/api/progress');
    expect(res.status).toBe(401);
  });
});

describe('reviews + import', () => {
  it('records reviews and returns latest state per card', async () => {
    await post('/api/reviews', { cardId: 'c1', grade: 'good',
      state: { ease: 2.5, intervalDays: 1, dueAt: '2026-11-08T00:00:00Z', reps: 1, lapses: 0 },
      createdAt: '2026-11-07T03:00:00Z' });
    await post('/api/reviews', { cardId: 'c1', grade: 'good',
      state: { ease: 2.5, intervalDays: 6, dueAt: '2026-11-13T00:00:00Z', reps: 2, lapses: 0 },
      createdAt: '2026-11-08T03:00:00Z' });
    const res = await app.request('/api/reviews', { headers: { cookie } });
    const states = await res.json() as Record<string, { intervalDays: number }>;
    expect(states['c1']!.intervalDays).toBe(6);
  });

  it('imports migratable data idempotently', async () => {
    const data = {
      progress: { 't1/m1/l1': { track: 't1', module: 'm1', itemId: 'l1', status: 'done', updatedAt: '2026-11-07T00:00:00Z' } },
      quizAttempts: [{ attemptId: 'qa1', module: 'm1', score: 8, max: 10, perQuestion: {}, createdAt: '2026-11-07T01:00:00Z' }],
      examAttempts: [],
      cardStates: { c1: { ease: 2.5, intervalDays: 1, dueAt: '2026-11-08T00:00:00Z', reps: 1, lapses: 0 } },
    };
    await post('/api/import', data);
    await post('/api/import', data); // same attempt ids → no dupes
    const list = await app.request('/api/attempts/quiz', { headers: { cookie } });
    expect(await list.json() as unknown[]).toHaveLength(1);
  });
});
