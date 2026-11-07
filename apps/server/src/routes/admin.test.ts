import { describe, expect, it, beforeEach } from 'vitest';
import { openDb, type DB } from '../db.js';
import { createApp } from '../index.js';
import type { Hono } from 'hono';
import type { AppEnv } from '../auth.js';

let db: DB;
let app: Hono<AppEnv>;
let adminCookie: string;
let learnerCookie: string;

beforeEach(async () => {
  db = openDb(':memory:');
  app = createApp(db);
  const reg = async (u: string) => {
    const res = await app.request('/api/auth/register', { method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username: u, displayName: u, password: 'longenough1' }) });
    if (res.status === 201) return (res.headers.get('set-cookie') ?? '').split(';')[0]!;
    // second user needs an invite
    db.prepare(`INSERT INTO invites (code, created_by, uses_left) VALUES ('INV', 1, 5)`).run();
    const res2 = await app.request('/api/auth/register', { method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ inviteCode: 'INV', username: u, displayName: u, password: 'longenough1' }) });
    return (res2.headers.get('set-cookie') ?? '').split(';')[0]!;
  };
  adminCookie = await reg('admin');
  learnerCookie = await reg('learner1');
});

describe('invites', () => {
  it('admin creates and lists invites', async () => {
    const res = await app.request('/api/admin/invites', { method: 'POST',
      headers: { 'content-type': 'application/json', cookie: adminCookie },
      body: JSON.stringify({ usesLeft: 3 }) });
    expect(res.status).toBe(201);
    const { code } = await res.json() as { code: string };
    expect(code).toMatch(/^[A-Z2-9]{8}$/);
    const list = await app.request('/api/admin/invites', { headers: { cookie: adminCookie } });
    expect((await list.json() as unknown[]).length).toBeGreaterThanOrEqual(1);
  });

  it('learner cannot create invites', async () => {
    const res = await app.request('/api/admin/invites', { method: 'POST',
      headers: { 'content-type': 'application/json', cookie: learnerCookie },
      body: JSON.stringify({}) });
    expect(res.status).toBe(403);
  });
});

describe('roster + csv', () => {
  it('roster shows aggregate stats', async () => {
    const res = await app.request('/api/admin/roster', { headers: { cookie: adminCookie } });
    const body = await res.json() as { users: Array<{ username: string; quizAttempts: number }> };
    expect(body.users.map((u) => u.username).sort()).toEqual(['admin', 'learner1']);
  });

  it('csv export has header + rows', async () => {
    const res = await app.request('/api/admin/export.csv', { headers: { cookie: adminCookie } });
    expect(res.headers.get('content-type')).toContain('text/csv');
    const text = await res.text();
    expect(text.split('\n')[0]).toBe('username,display_name,role,last_seen_at,quiz_attempts,best_quiz_pct,exam_attempts,best_exam_pct,cards_tracked');
    expect(text.trim().split('\n')).toHaveLength(3);
  });
});

describe('users', () => {
  it('admin creates a user and resets a password', async () => {
    const res = await app.request('/api/admin/users', { method: 'POST',
      headers: { 'content-type': 'application/json', cookie: adminCookie },
      body: JSON.stringify({ username: 'newbie', displayName: 'New', password: 'longenough1', role: 'learner' }) });
    expect(res.status).toBe(201);
    const id = (await res.json() as { user: { id: number } }).user.id;
    const reset = await app.request(`/api/admin/users/${id}/password`, { method: 'POST',
      headers: { 'content-type': 'application/json', cookie: adminCookie },
      body: JSON.stringify({ password: 'anotherlong1' }) });
    expect(reset.status).toBe(204);
    const login = await app.request('/api/auth/login', { method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username: 'newbie', password: 'anotherlong1' }) });
    expect(login.status).toBe(200);
  });
});
