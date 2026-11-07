import { describe, expect, it, beforeEach } from 'vitest';
import { openDb, type DB } from './db.js';
import { createApp } from './index.js';
import type { Hono } from 'hono';
import type { AppEnv } from './auth.js';

let db: DB;
let app: Hono<AppEnv>;

beforeEach(() => {
  db = openDb(':memory:');
  app = createApp(db);
});

function parseCookie(res: Response): string {
  const setCookie = res.headers.get('set-cookie') ?? '';
  return setCookie.split(';')[0] ?? '';
}

describe('auth', () => {
  it('first registration with no invite becomes admin (bootstrap)', async () => {
    const res = await app.request('/api/auth/register', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username: 'admin', displayName: 'Admin', password: 'longenough1' }),
    });
    expect(res.status).toBe(201);
    const body = await res.json() as { user: { role: string } };
    expect(body.user.role).toBe('admin');
    expect(res.headers.get('set-cookie')).toContain('tet_session=');
  });

  it('second registration without invite is rejected', async () => {
    // Brief used 1-char placeholders 'a'/'b' which cannot pass the mandated /^[a-z0-9_-]{3,32}$/ rule;
    // renamed to 'aaa'/'bbb' so this test exercises the invite gate (its actual intent), not username length.
    await app.request('/api/auth/register', { method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username: 'aaa', displayName: 'A', password: 'longenough1' }) });
    const res = await app.request('/api/auth/register', { method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username: 'bbb', displayName: 'B', password: 'longenough1' }) });
    expect(res.status).toBe(403);
  });

  it('registration with a valid invite creates a learner and consumes a use', async () => {
    await app.request('/api/auth/register', { method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username: 'admin', displayName: 'A', password: 'longenough1' }) });
    db.prepare(`INSERT INTO invites (code, created_by, uses_left, expires_at) VALUES ('WELCOME', 1, 1, NULL)`).run();
    const res = await app.request('/api/auth/register', { method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ inviteCode: 'WELCOME', username: 'learner1', displayName: 'L1', password: 'longenough1' }) });
    expect(res.status).toBe(201);
    const body = await res.json() as { user: { role: string } };
    expect(body.user.role).toBe('learner');
    const uses = db.prepare(`SELECT uses_left FROM invites WHERE code = 'WELCOME'`).get() as { uses_left: number };
    expect(uses.uses_left).toBe(0);
  });

  it('an exhausted invite is rejected', async () => {
    await app.request('/api/auth/register', { method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username: 'admin', displayName: 'A', password: 'longenough1' }) });
    // 'xxx' (not the 1-char placeholder 'x') so no test data contradicts the product regex;
    // the exhausted-invite gate still 403s before username validation would matter.
    db.prepare(`INSERT INTO invites (code, created_by, uses_left) VALUES ('USED', 1, 0)`).run();
    const res = await app.request('/api/auth/register', { method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ inviteCode: 'USED', username: 'xxx', displayName: 'X', password: 'longenough1' }) });
    expect(res.status).toBe(403);
  });

  it('rejects weak passwords and bad usernames', async () => {
    const res = await app.request('/api/auth/register', { method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username: 'ok-name', displayName: 'X', password: 'short' }) });
    expect(res.status).toBe(400);
  });

  it('login sets a cookie; /api/me reads it; logout clears the session', async () => {
    await app.request('/api/auth/register', { method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username: 'admin', displayName: 'A', password: 'longenough1' }) });
    const login = await app.request('/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'longenough1' }) });
    expect(login.status).toBe(200);
    const cookie = parseCookie(login);
    expect(cookie).toContain('tet_session=');

    const me = await app.request('/api/me', { headers: { cookie } });
    expect(me.status).toBe(200);
    const meBody = await me.json() as { user: { username: string } };
    expect(meBody.user.username).toBe('admin');

    const bad = await app.request('/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'wrongpassword' }) });
    expect(bad.status).toBe(401);

    const out = await app.request('/api/auth/logout', { method: 'POST', headers: { cookie } });
    expect(out.status).toBe(204);
    const meAfter = await app.request('/api/me', { headers: { cookie } });
    expect(meAfter.status).toBe(401);
  });
});
