import { Hono } from 'hono';
import { randomBytes } from 'node:crypto';
import type { AppEnv, AuthedUser } from '../auth.js';
import { hashPassword, requireAdmin } from '../auth.js';

const CODE_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/**
 * CSV field encoding per RFC 4180, with a spreadsheet formula-injection guard:
 * quote fields containing comma, quote, or newline (doubling embedded quotes),
 * and prefix leading =/+/−/@ with an apostrophe so learner-controlled text
 * (e.g. display_name) can never execute as a formula in the admin's Excel.
 */
function csvField(value: unknown): string {
  let s = value === null || value === undefined ? '' : String(value);
  if (/^[=+\-@]/.test(s)) s = `'${s}`;
  if (/[",\r\n]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
  return s;
}

function inviteCode(): string {
  const bytes = randomBytes(8);
  return Array.from(bytes, (b) => CODE_ALPHABET[b % 32]).join('');
}

export function adminRoutes(): Hono<AppEnv> {
  const r = new Hono<AppEnv>();
  r.use('*', requireAdmin());

  r.get('/roster', (c) => {
    const rows = c.get('db').prepare(`
      SELECT u.id, u.username, u.display_name, u.role, u.last_seen_at,
        (SELECT COUNT(*) FROM quiz_attempts q WHERE q.user_id = u.id) AS quiz_attempts,
        (SELECT MAX(ROUND(100.0 * q.score / q.max_score)) FROM quiz_attempts q WHERE q.user_id = u.id AND q.max_score > 0) AS best_quiz_pct,
        (SELECT COUNT(*) FROM exam_attempts e WHERE e.user_id = u.id) AS exam_attempts,
        (SELECT MAX(e.score_pct) FROM exam_attempts e WHERE e.user_id = u.id) AS best_exam_pct,
        (SELECT COUNT(*) FROM card_states s WHERE s.user_id = u.id) AS cards_tracked
      FROM users u ORDER BY u.username`).all() as Array<Record<string, unknown>>;
    return c.json({
      users: rows.map((row) => ({
        id: row.id, username: row.username, displayName: row.display_name, role: row.role,
        lastSeenAt: row.last_seen_at, quizAttempts: row.quiz_attempts,
        bestQuizPct: row.best_quiz_pct, examAttempts: row.exam_attempts,
        bestExamPct: row.best_exam_pct, cardsTracked: row.cards_tracked,
      })),
    });
  });

  r.post('/invites', async (c) => {
    const body = await c.req.json<{ usesLeft?: number; expiresAt?: string }>().catch(() => null);
    if (!body) return c.json({ error: 'invalid JSON body' }, 400);
    const code = inviteCode();
    c.get('db').prepare('INSERT INTO invites (code, created_by, uses_left, expires_at) VALUES (?, ?, ?, ?)')
      .run(code, c.get('user')!.id, body.usesLeft ?? 1, body.expiresAt ?? null);
    return c.json({ code }, 201);
  });

  r.get('/invites', (c) => {
    const rows = c.get('db').prepare('SELECT code, uses_left, expires_at, created_by FROM invites ORDER BY rowid DESC').all() as Array<Record<string, unknown>>;
    return c.json(rows.map((row) => ({ code: row.code, usesLeft: row.uses_left, expiresAt: row.expires_at, createdBy: row.created_by })));
  });

  r.post('/users', async (c) => {
    const body = await c.req.json<{ username: string; displayName: string; password: string; role: 'admin' | 'learner' }>().catch(() => null);
    if (!body) return c.json({ error: 'invalid JSON body' }, 400);
    if (!/^[a-z0-9_-]{3,32}$/.test(body.username)) return c.json({ error: 'invalid username' }, 400);
    if (body.password.length < 8) return c.json({ error: 'password must be at least 8 characters' }, 400);
    const exists = c.get('db').prepare('SELECT id FROM users WHERE username = ?').get(body.username);
    if (exists) return c.json({ error: 'username already taken' }, 409);
    const info = c.get('db').prepare(
      'INSERT INTO users (username, display_name, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?)')
      .run(body.username, body.displayName || body.username, hashPassword(body.password), body.role, new Date().toISOString());
    return c.json({ user: { id: Number(info.lastInsertRowid), username: body.username, role: body.role } }, 201);
  });

  r.post('/users/:id/password', async (c) => {
    const body = await c.req.json<{ password: string }>().catch(() => null);
    if (!body) return c.json({ error: 'invalid JSON body' }, 400);
    const { password } = body;
    if (password.length < 8) return c.json({ error: 'password must be at least 8 characters' }, 400);
    const info = c.get('db').prepare('UPDATE users SET password_hash = ? WHERE id = ?')
      .run(hashPassword(password), Number(c.req.param('id')));
    if (info.changes === 0) return c.json({ error: 'no such user' }, 404);
    c.get('db').prepare('DELETE FROM sessions WHERE user_id = ?').run(Number(c.req.param('id')));
    return c.body(null, 204);
  });

  r.get('/export.csv', (c) => {
    const rows = c.get('db').prepare(`
      SELECT u.username, u.display_name, u.role, u.last_seen_at,
        (SELECT COUNT(*) FROM quiz_attempts q WHERE q.user_id = u.id) AS quiz_attempts,
        (SELECT MAX(ROUND(100.0 * q.score / q.max_score)) FROM quiz_attempts q WHERE q.user_id = u.id AND q.max_score > 0) AS best_quiz_pct,
        (SELECT COUNT(*) FROM exam_attempts e WHERE e.user_id = u.id) AS exam_attempts,
        (SELECT MAX(e.score_pct) FROM exam_attempts e WHERE e.user_id = u.id) AS best_exam_pct,
        (SELECT COUNT(*) FROM card_states s WHERE s.user_id = u.id) AS cards_tracked
      FROM users u ORDER BY u.username`).all() as Array<Record<string, unknown>>;
    const header = 'username,display_name,role,last_seen_at,quiz_attempts,best_quiz_pct,exam_attempts,best_exam_pct,cards_tracked';
    const lines = rows.map((row) => [
      row.username, row.display_name, row.role, row.last_seen_at ?? '', row.quiz_attempts,
      row.best_quiz_pct ?? '', row.exam_attempts, row.best_exam_pct ?? '', row.cards_tracked,
    ].map(csvField).join(','));
    return c.text([header, ...lines].join('\n'), 200, { 'content-type': 'text/csv' });
  });

  return r;
}
