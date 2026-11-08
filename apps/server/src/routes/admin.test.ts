import { describe, expect, it, beforeEach } from 'vitest';
import { openDb, type DB } from '../db.js';
import { SqliteStore } from '../store/index.js';
import { createApp } from '../index.js';
import type { Hono } from 'hono';
import type { AppEnv } from '../auth.js';

let db: DB;
let app: Hono<AppEnv>;
let adminCookie: string;
let learnerCookie: string;

beforeEach(async () => {
  db = openDb(':memory:');
  app = createApp(new SqliteStore(db));
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
    // cards_reviewed counts raw review events per user (from card_reviews),
    // distinct from cards_tracked's distinct-cards count (from card_states).
    const learner = db.prepare('SELECT id FROM users WHERE username = ?').get('learner1') as { id: number };
    const review = db.prepare(`INSERT INTO card_reviews
      (user_id, card_id, grade, ease, interval_days, due_at, created_at)
      VALUES (?, 'istqb-fc-0001', 'good', 2.5, 1, '2026-11-08', '2026-11-07T00:00:00Z')`);
    review.run(learner.id);
    review.run(learner.id); // two reviews of the same card, but card_states has no row: tracked 0, reviewed 2
    const res = await app.request('/api/admin/roster', { headers: { cookie: adminCookie } });
    const body = await res.json() as { users: Array<{ username: string; cardsReviewed: number; cardsTracked: number }> };
    expect(body.users.map((u) => u.username).sort()).toEqual(['admin', 'learner1']);
    expect(body.users.find((u) => u.username === 'learner1')).toMatchObject({ cardsReviewed: 2, cardsTracked: 0 });
    expect(body.users.find((u) => u.username === 'admin')).toMatchObject({ cardsReviewed: 0 });
  });

  it('csv export has header + rows', async () => {
    const res = await app.request('/api/admin/export.csv', { headers: { cookie: adminCookie } });
    expect(res.headers.get('content-type')).toContain('text/csv');
    const text = await res.text();
    expect(text.split('\n')[0]).toBe('username,display_name,role,last_seen_at,quiz_attempts,best_quiz_pct,exam_attempts,best_exam_pct,cards_tracked,cards_reviewed');
    expect(text.trim().split('\n')).toHaveLength(3);
  });

  it('csv export neutralizes spreadsheet formula injection and quotes commas', async () => {
    // display_name is learner-controlled at registration: a formula payload
    // must not survive into the admin's Excel as an executable cell value.
    db.prepare(`INSERT INTO invites (code, created_by, uses_left) VALUES ('EVL', 1, 5)`).run();
    db.prepare(`INSERT INTO invites (code, created_by, uses_left) VALUES ('CMMA', 1, 5)`).run();
    const reg = async (invite: string, username: string, displayName: string) => {
      const res = await app.request('/api/auth/register', { method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ inviteCode: invite, username, displayName, password: 'longenough1' }) });
      expect(res.status).toBe(201);
    };
    await reg('EVL', 'eviluser', `=cmd|' /C calc'!A0`);
    await reg('CMMA', 'commauser', 'Doe, Jane');
    // Admin-created display names are stored verbatim (no trim), so a
    // tab-prefixed formula payload reaches the CSV — Excel strips leading
    // whitespace before formula parsing, so it must be defused exactly like
    // the =/+/-/@ ones.
    const tabRes = await app.request('/api/admin/users', { method: 'POST',
      headers: { 'content-type': 'application/json', cookie: adminCookie },
      body: JSON.stringify({ username: 'tabuser', displayName: `\tSUM(A1:A2)`, password: 'longenough1', role: 'learner' }) });
    expect(tabRes.status).toBe(201);

    const text = await (await app.request('/api/admin/export.csv', { headers: { cookie: adminCookie } })).text();
    const lines = text.trim().split('\n');
    expect(lines[0]).toBe('username,display_name,role,last_seen_at,quiz_attempts,best_quiz_pct,exam_attempts,best_exam_pct,cards_tracked,cards_reviewed');

    const evilRow = lines.find((l) => l.startsWith('eviluser,'))!;
    // Formula is defused with a leading apostrophe (Excel treats it as text).
    expect(evilRow).toContain(`,'=cmd|' /C calc'!A0,`);

    const commaRow = lines.find((l) => l.startsWith('commauser,'))!;
    // Comma-bearing field is RFC 4180 quoted, with embedded quotes doubled
    // (none here) — an RFC-aware parse recovers the original value.
    expect(commaRow).toContain(`,"Doe, Jane",`);

    // Minimal RFC 4180 line parser: quoted commas stay inside the field.
    function parseCsvLine(line: string): string[] {
      const fields: string[] = [];
      let cur = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i]!;
        if (inQuotes) {
          if (ch === '"') {
            if (line[i + 1] === '"') { cur += '"'; i++; } else inQuotes = false;
          } else cur += ch;
        } else if (ch === '"') inQuotes = true;
        else if (ch === ',') { fields.push(cur); cur = ''; }
        else cur += ch;
      }
      fields.push(cur);
      return fields;
    }
    expect(parseCsvLine(lines[0]!)).toHaveLength(10);
    const jane = parseCsvLine(commaRow);
    expect(jane).toHaveLength(10);
    expect(jane[1]).toBe('Doe, Jane');
    const evil = parseCsvLine(evilRow);
    expect(evil[1]).toBe(`'=cmd|' /C calc'!A0`);
    const tabRow = lines.find((l) => l.startsWith('tabuser,'))!;
    // Tab-prefixed payload defused with the same leading apostrophe.
    expect(tabRow).toContain(`,'\tSUM(A1:A2)`);
    const tab = parseCsvLine(tabRow);
    expect(tab).toHaveLength(10);
    expect(tab[1]).toBe(`'\tSUM(A1:A2)`);
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

  it('rejects an invalid role with 400 instead of 500', async () => {
    const res = await app.request('/api/admin/users', { method: 'POST',
      headers: { 'content-type': 'application/json', cookie: adminCookie },
      body: JSON.stringify({ username: 'rolebad', displayName: 'R', password: 'longenough1', role: 'superadmin' }) });
    expect(res.status).toBe(400);
  });
});
