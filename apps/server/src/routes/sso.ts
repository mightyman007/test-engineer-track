import { Hono } from 'hono';
import { setCookie } from 'hono/cookie';
import type { AppEnv, AuthedUser } from '../auth.js';
import { COOKIE, createSession, sessionCookie } from '../auth.js';
import { ssoEnabled, verifyUserToken, adminEmails } from '../sso.js';

/**
 * M6 SSO: on a Dana deployment the edge injects X-User-Token (an RS256 JWT
 * minted from the signed-in user's Ondana session — their Applied or
 * okta-ext identity). Verifying it auto-provisions the local account and
 * issues our normal session cookie. No password, no invite.
 */
export function ssoRoutes(): Hono<AppEnv> {
  const r = new Hono<AppEnv>();

  r.post('/auth/sso', async (c) => {
    if (!ssoEnabled()) return c.json({ error: 'sso not enabled' }, 404);
    // The edge delivers "Bearer <jwt>" inside the header — strip the scheme
    // before JOSE sees it.
    const raw = c.req.header("X-User-Token");
    const userToken = raw?.replace(/^Bearer\s+/i, "");
    if (!userToken) return c.json({ error: "no X-User-Token" }, 401);
    let identity;
    try {
      identity = await verifyUserToken(userToken);
    } catch (err) {
      return c.json({ error: `invalid user token: ${String(err).slice(0, 120)}` }, 401);
    }
    const db = c.get('db');
    const displayName = identity.displayName ?? identity.identityId.slice(0, 24);
    const isAdmin = identity.email ? adminEmails().has(identity.email.toLowerCase()) : false;

    let userId: number;
    const userCount = db.prepare('SELECT COUNT(*) AS n FROM users').get() as { n: number };
    const existing = db.prepare('SELECT id FROM users WHERE identity_id = ?').get(identity.identityId) as { id: number } | undefined;
    if (existing) {
      userId = existing.id;
      db.prepare('UPDATE users SET display_name = ?, email = COALESCE(?, email), last_seen_at = ? WHERE id = ?')
        .run(displayName, identity.email ?? null, new Date().toISOString(), userId);
    } else {
      // Bootstrap parity with local register: the first user on an empty
      // deployment becomes admin; otherwise ADMIN_EMAILS governs.
      const bootstrapAdmin = userCount.n === 0;
      const info = db.prepare(
        'INSERT INTO users (username, display_name, password_hash, role, created_at, identity_id, email, auth_provider) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      ).run(
        `sso-${identity.identityId.slice(0, 12)}`, displayName, 'sso:no-password',
        isAdmin || bootstrapAdmin ? 'admin' : 'learner', new Date().toISOString(), identity.identityId, identity.email ?? null, 'ondana-sso',
      );
      userId = Number(info.lastInsertRowid);
    }
    const row = db.prepare('SELECT role, username FROM users WHERE id = ?').get(userId) as { role: string; username: string };
    const user: AuthedUser = { id: userId, username: row.username, displayName, role: row.role as 'admin' | 'learner' };
    const { token, expiresAt } = createSession(db, userId);
    setCookie(c, COOKIE, token, { httpOnly: true, sameSite: 'Lax', path: '/', expires: new Date(expiresAt) });
    return c.json({ user: { username: user.username, displayName: user.displayName, role: user.role } }, 200);
  });

  return r;
}
