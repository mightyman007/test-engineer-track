import { Hono } from 'hono';
import { randomBytes } from 'node:crypto';
import type { AppEnv } from '../auth.js';
import { hashPassword, requireAdmin } from '../auth.js';

const CODE_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/**
 * CSV field encoding per RFC 4180, with a spreadsheet formula-injection guard:
 * quote fields containing comma, quote, or newline (doubling embedded quotes),
 * and prefix leading =/+/−/@/tab with an apostrophe so learner-controlled text
 * (e.g. display_name) can never execute as a formula in the admin's Excel.
 * Tab joins the list because spreadsheet apps strip leading whitespace before
 * formula parsing — "\t=…" would still execute undefused.
 */
function csvField(value: unknown): string {
  let s = value === null || value === undefined ? '' : String(value);
  if (/^[=+\-@\t]/.test(s)) s = `'${s}`;
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

  r.get('/roster', async (c) => {
    const rows = await c.get('store').getRoster();
    return c.json({
      users: rows.map((row) => ({
        id: row.id, username: row.username, displayName: row.displayName, role: row.role,
        lastSeenAt: row.lastSeenAt, quizAttempts: row.quizAttempts,
        bestQuizPct: row.bestQuizPct, examAttempts: row.examAttempts,
        bestExamPct: row.bestExamPct, cardsTracked: row.cardsTracked,
        cardsReviewed: row.cardsReviewed,
      })),
    });
  });

  r.post('/invites', async (c) => {
    const body = await c.req.json<{ usesLeft?: number; expiresAt?: string }>().catch(() => null);
    if (!body) return c.json({ error: 'invalid JSON body' }, 400);
    const code = inviteCode();
    await c.get('store').createInvite({
      code, createdBy: c.get('user')!.id, usesLeft: body.usesLeft ?? 1, expiresAt: body.expiresAt ?? null,
    });
    return c.json({ code }, 201);
  });

  r.get('/invites', async (c) => {
    const rows = await c.get('store').listInvites();
    return c.json(rows.map((row) => ({ code: row.code, usesLeft: row.usesLeft, expiresAt: row.expiresAt, createdBy: row.createdBy })));
  });

  r.post('/users', async (c) => {
    const body = await c.req.json<{ username: string; displayName: string; password: string; role: 'admin' | 'learner' }>().catch(() => null);
    if (!body) return c.json({ error: 'invalid JSON body' }, 400);
    if (!/^[a-z0-9_-]{3,32}$/.test(body.username)) return c.json({ error: 'invalid username' }, 400);
    if (body.password.length < 8) return c.json({ error: 'password must be at least 8 characters' }, 400);
    if (body.role !== 'admin' && body.role !== 'learner') return c.json({ error: 'invalid role' }, 400);
    const exists = await c.get('store').getUserByUsername(body.username);
    if (exists) return c.json({ error: 'username already taken' }, 409);
    const id = await c.get('store').createUser({
      username: body.username, displayName: body.displayName || body.username,
      passwordHash: hashPassword(body.password), role: body.role, createdAt: new Date().toISOString(),
    });
    return c.json({ user: { id, username: body.username, role: body.role } }, 201);
  });

  r.post('/users/:id/password', async (c) => {
    const body = await c.req.json<{ password: string }>().catch(() => null);
    if (!body) return c.json({ error: 'invalid JSON body' }, 400);
    const { password } = body;
    if (password.length < 8) return c.json({ error: 'password must be at least 8 characters' }, 400);
    const updated = await c.get('store').updateUserPassword(Number(c.req.param('id')), hashPassword(password));
    if (!updated) return c.json({ error: 'no such user' }, 404);
    await c.get('store').deleteSessionsForUser(Number(c.req.param('id')));
    return c.body(null, 204);
  });

  r.get('/export.csv', async (c) => {
    const rows = await c.get('store').getRoster();
    const header = 'username,display_name,role,last_seen_at,quiz_attempts,best_quiz_pct,exam_attempts,best_exam_pct,cards_tracked,cards_reviewed';
    const lines = rows.map((row) => [
      row.username, row.displayName, row.role, row.lastSeenAt ?? '', row.quizAttempts,
      row.bestQuizPct ?? '', row.examAttempts, row.bestExamPct ?? '', row.cardsTracked,
      row.cardsReviewed,
    ].map(csvField).join(','));
    return c.text([header, ...lines].join('\n'), 200, { 'content-type': 'text/csv' });
  });

  return r;
}
