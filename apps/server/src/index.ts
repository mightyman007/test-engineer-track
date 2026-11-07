import { Hono } from 'hono';
import type { Context, Next } from 'hono';
import { setCookie, deleteCookie } from 'hono/cookie';
import type { DB } from './db.js';
import {
  AppEnv, COOKIE, createSession, hashPassword,
  userFromCookie, verifyPassword,
} from './auth.js';
import { dataRoutes } from './routes/data.js';
import { adminRoutes } from './routes/admin.js';
import { ttsRoutes } from './routes/tts.js';

const USERNAME_RE = /^[a-z0-9_-]{3,32}$/;

/**
 * Minimal CORS: the SPA is a static build hosted on a different origin than
 * the API (Ondana static hosting + a server placed anywhere), so browser
 * cohort logins are cross-origin by design. Echo the request Origin — `*`
 * is invalid together with credentials — and answer preflights.
 */
export function cors(): (c: Context<AppEnv>, next: Next) => Promise<Response | void> {
  return async (c, next) => {
    const origin = c.req.header('origin');
    if (origin) {
      c.header('Access-Control-Allow-Origin', origin);
      c.header('Access-Control-Allow-Credentials', 'true');
      c.header('Vary', 'Origin');
      if (c.req.method === 'OPTIONS') {
        c.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        c.header('Access-Control-Allow-Headers', 'content-type');
        c.header('Access-Control-Max-Age', '86400');
        return c.body(null, 204);
      }
    }
    await next();
  };
}

export function createApp(db: DB): Hono<AppEnv> {
  const app = new Hono<AppEnv>();

  app.use('*', cors());
  app.use('*', async (c, next) => {
    c.set('db', db);
    await next();
  });

  app.post('/api/auth/register', async (c) => {
    const body = await c.req.json<Record<string, unknown>>();
    const username = String(body.username ?? '');
    const displayName = String(body.displayName ?? '').trim() || username;
    const password = String(body.password ?? '');
    const inviteCode = typeof body.inviteCode === 'string' ? body.inviteCode.trim() : '';

    // Bootstrap/invite gate runs before format validation: it decides whether this
    // registration is allowed at all (403) regardless of field validity.
    const userCount = db.prepare('SELECT COUNT(*) AS n FROM users').get() as { n: number };
    let role: 'admin' | 'learner' = 'learner';
    let usedInviteCode: string | null = null;
    if (userCount.n === 0) {
      role = 'admin'; // bootstrap admin needs no invite
    } else {
      const invite = inviteCode
        ? db.prepare('SELECT * FROM invites WHERE code = ?').get(inviteCode) as
            { code: string; uses_left: number; expires_at: string | null } | undefined
        : undefined;
      if (!invite || invite.uses_left <= 0 ||
          (invite.expires_at && new Date(invite.expires_at) < new Date())) {
        return c.json({ error: 'valid invite code required' }, 403);
      }
      usedInviteCode = invite.code;
    }

    if (!USERNAME_RE.test(username)) return c.json({ error: 'invalid username (3-32 chars: a-z 0-9 _ -)' }, 400);
    if (password.length < 8) return c.json({ error: 'password must be at least 8 characters' }, 400);

    const exists = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    if (exists) return c.json({ error: 'username already taken' }, 409);

    // Invite decrement + user insert happen atomically, so a failed insert never burns a use.
    const passwordHash = hashPassword(password);
    const createdAt = new Date().toISOString();
    const register = db.transaction(() => {
      if (usedInviteCode) {
        db.prepare('UPDATE invites SET uses_left = uses_left - 1 WHERE code = ?').run(usedInviteCode);
      }
      const info = db.prepare(
        'INSERT INTO users (username, display_name, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?)',
      ).run(username, displayName, passwordHash, role, createdAt);
      return Number(info.lastInsertRowid);
    });
    const userId = register();
    const { token, expiresAt } = createSession(db, userId);
    setCookie(c, COOKIE, token, { httpOnly: true, sameSite: 'Lax', path: '/', expires: new Date(expiresAt) });
    return c.json({ user: { username, displayName, role } }, 201);
  });

  app.post('/api/auth/login', async (c) => {
    const body = await c.req.json<Record<string, unknown>>();
    const row = db.prepare('SELECT * FROM users WHERE username = ?')
      .get(String(body.username ?? '')) as
      { id: number; username: string; password_hash: string; role: string } | undefined;
    if (!row || !verifyPassword(String(body.password ?? ''), row.password_hash)) {
      return c.json({ error: 'invalid credentials' }, 401);
    }
    db.prepare('UPDATE users SET last_seen_at = ? WHERE id = ?').run(new Date().toISOString(), row.id);
    const { token, expiresAt } = createSession(db, row.id);
    setCookie(c, COOKIE, token, { httpOnly: true, sameSite: 'Lax', path: '/', expires: new Date(expiresAt) });
    return c.json({ user: { username: row.username, role: row.role } }, 200);
  });

  app.post('/api/auth/logout', (c) => {
    const user = userFromCookie(db, c);
    if (user) {
      // Sessions are keyed by token hash; delete every session for robustness on logout-all semantics later.
      db.prepare('DELETE FROM sessions WHERE user_id = ?').run(user.id);
    }
    deleteCookie(c, COOKIE, { path: '/' });
    return c.body(null, 204);
  });

  app.get('/api/me', (c) => {
    const user = userFromCookie(db, c);
    if (!user) return c.json({ error: 'unauthorized' }, 401);
    return c.json({ user }, 200);
  });

  app.route('/api', dataRoutes());
  app.route('/api/admin', adminRoutes());
  app.route('/api/tts', ttsRoutes());

  return app;
}

// Entry point (only when run directly): open DB, serve.
import { serve } from '@hono/node-server';
import { openDb } from './db.js';

const isMain = process.argv[1] && process.argv[1].endsWith('src/index.ts');
if (isMain) {
  const db = openDb(process.env.DB_PATH ?? './data/tet.sqlite3');
  const app = createApp(db);
  const port = Number(process.env.PORT ?? 8787);
  serve({ fetch: app.fetch, port });
  console.log(`test-engineer-track server on :${port}`);
}
