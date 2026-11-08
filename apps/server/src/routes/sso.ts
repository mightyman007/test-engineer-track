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
    const store = c.get('store');
    const displayName = identity.displayName ?? identity.identityId.slice(0, 24);
    const isAdmin = identity.email ? adminEmails().has(identity.email.toLowerCase()) : false;

    const userCount = await store.countUsers();
    const existing = await store.getUserByIdentityId(identity.identityId);
    let userId: number;
    if (existing) {
      userId = existing.id;
      await store.updateUserSso(userId, displayName, identity.email ?? null, new Date().toISOString());
    } else {
      // Bootstrap parity with local register: the first user on an empty
      // deployment becomes admin; otherwise ADMIN_EMAILS governs.
      const bootstrapAdmin = userCount === 0;
      userId = await store.createUser({
        username: `sso-${identity.identityId.slice(0, 12)}`,
        displayName,
        passwordHash: 'sso:no-password',
        role: isAdmin || bootstrapAdmin ? 'admin' : 'learner',
        createdAt: new Date().toISOString(),
        identity: {
          identityId: identity.identityId,
          email: identity.email ?? null,
          authProvider: 'ondana-sso',
        },
      });
    }
    const row = await store.getUserById(userId);
    if (!row) throw new Error('SSO user missing right after provision');
    const user: AuthedUser = { id: userId, username: row.username, displayName, role: row.role };
    const { token, expiresAt } = await createSession(store, userId);
    setCookie(c, COOKIE, token, { httpOnly: true, sameSite: 'Lax', path: '/', expires: new Date(expiresAt) });
    return c.json({ user: { username: user.username, displayName: user.displayName, role: user.role } }, 200);
  });

  return r;
}
