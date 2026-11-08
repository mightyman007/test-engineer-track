import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { generateKeyPair, exportJWK, SignJWT } from 'jose';
import { identityFromClaims, verifyUserToken, adminEmails } from './sso.js';

// Local RSA keypair stands in for the platform's registry keys; the discovery
// + JWKS fetches are stubbed to serve it (no network in tests).
const { publicKey, privateKey } = await generateKeyPair('RS256', { extractable: true });
const jwk = { ...await exportJWK(publicKey), kid: 'test-key-1', alg: 'RS256', use: 'sig' };
const ISSUER = 'https://issuer.test';

const discovery = { issuer: ISSUER, jwks_uri: 'https://issuer.test/jwks.json', id_token_signing_alg_values_supported: ['RS256'] };

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(async (url: string | URL) => {
    const u = String(url);
    if (u.endsWith('/.well-known/openid-configuration')) {
      return new Response(JSON.stringify(discovery), { status: 200 });
    }
    if (u.endsWith('/jwks.json')) {
      return new Response(JSON.stringify({ keys: [jwk] }), { status: 200 });
    }
    return new Response('not found', { status: 404 });
  }) as unknown as typeof fetch);
  process.env.USER_TOKEN_ISSUER = ISSUER;
});
afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.USER_TOKEN_ISSUER;
});

async function mint(claims: Record<string, unknown>): Promise<string> {
  return new SignJWT(claims).setProtectedHeader({ alg: 'RS256', kid: 'test-key-1' })
    .setIssuer(ISSUER).setIssuedAt().setExpirationTime('5m').sign(privateKey);
}

describe('verifyUserToken', () => {
  it('verifies a platform token and extracts the identity', async () => {
    const token = await mint({ sub: 'identity-abc', email: 'user@applied.co', name: 'Test User' });
    const id = await verifyUserToken(token);
    expect(id.identityId).toBe('identity-abc');
    expect(id.email).toBe('user@applied.co');
    expect(id.displayName).toBe('Test User');
  });

  it('rejects a wrong-issuer token', async () => {
    const token = await new SignJWT({ sub: 'x' }).setProtectedHeader({ alg: 'RS256', kid: 'test-key-1' })
      .setIssuer('https://evil.test').setIssuedAt().setExpirationTime('5m').sign(privateKey);
    await expect(verifyUserToken(token)).rejects.toThrow();
  });

  it('rejects an expired token', async () => {
    const token = await new SignJWT({ sub: 'x' }).setProtectedHeader({ alg: 'RS256', kid: 'test-key-1' })
      .setIssuer(ISSUER).setIssuedAt(Date.now() / 1000 - 3600).setExpirationTime(Date.now() / 1000 - 1800).sign(privateKey);
    await expect(verifyUserToken(token)).rejects.toThrow();
  });

  it('rejects a token signed by an unknown key', async () => {
    const other = await generateKeyPair('RS256', { extractable: true });
    const token = await new SignJWT({ sub: 'x' }).setProtectedHeader({ alg: 'RS256' })
      .setIssuer(ISSUER).setIssuedAt().setExpirationTime('5m').sign(other.privateKey);
    await expect(verifyUserToken(token)).rejects.toThrow();
  });

  it('identityFromClaims throws without a subject', () => {
    expect(() => identityFromClaims({})).toThrow(/no subject/);
  });
});

describe('adminEmails', () => {
  it('parses the comma-separated allowlist (case-insensitive)', () => {
    vi.stubEnv('ADMIN_EMAILS', 'Admin@Applied.co, other@applied.co');
    const set = adminEmails();
    expect(set.has('admin@applied.co')).toBe(true);
    expect(set.has('other@applied.co')).toBe(true);
    expect(set.has('nope@applied.co')).toBe(false);
  });
});

// Route-level: the full SSO login against the real app (in-memory DB).
import { openDb, type DB } from './db.js';
import { createApp } from './index.js';
import type { Hono } from 'hono';
import type { AppEnv } from './auth.js';

describe('POST /api/auth/sso (route)', () => {
  let db: DB;
  let app: Hono<AppEnv>;

  beforeEach(() => {
    db = openDb(':memory:');
    app = createApp(db);
  });

  function parseCookie(res: Response): string {
    return (res.headers.get('set-cookie') ?? '').split(';')[0] ?? '';
  }

  it('bootstraps: the first SSO identity on an empty deployment becomes admin', async () => {
    const token = await mint({ sub: 'identity-xyz', email: 'owner@applied.co', name: 'SSO Owner' });
    const res = await app.request('/api/auth/sso', { method: 'POST', headers: { 'x-user-token': token } });
    expect(res.status).toBe(200);
    const body = await res.json() as { user: { displayName: string; role: string } };
    expect(body.user.displayName).toBe('SSO Owner');
    expect(body.user.role).toBe('admin'); // bootstrap parity with local register
    const cookie = parseCookie(res);
    expect(cookie).toContain('tet_session=');

    const me = await app.request('/api/me', { headers: { cookie } });
    expect(me.status).toBe(200);
    const meBody = await me.json() as { user: { displayName: string } };
    expect(meBody.user.displayName).toBe('SSO Owner');

    // Second login with the same identity reuses the account (no duplicate).
    const again = await app.request('/api/auth/sso', { method: 'POST', headers: { 'x-user-token': await mint({ sub: 'identity-xyz', email: 'owner@applied.co', name: 'SSO Owner' }) } });
    expect(again.status).toBe(200);
    const count = db.prepare('SELECT COUNT(*) AS n FROM users WHERE identity_id = ?').get('identity-xyz') as { n: number };
    expect(count.n).toBe(1);
  });

  it('a later SSO identity is a learner when ADMIN_EMAILS does not match', async () => {
    // Bootstrap the deployment first.
    await app.request('/api/auth/sso', { method: 'POST', headers: { 'x-user-token': await mint({ sub: 'identity-xyz', email: 'owner@applied.co', name: 'Owner' }) } });
    const token = await mint({ sub: 'identity-learner', email: 'learner@applied.co', name: 'SSO Learner' });
    const res = await app.request('/api/auth/sso', { method: 'POST', headers: { 'x-user-token': token } });
    expect(res.status).toBe(200);
    const body = await res.json() as { user: { displayName: string; role: string } };
    expect(body.user.displayName).toBe('SSO Learner');
    expect(body.user.role).toBe('learner'); // not bootstrap, not in ADMIN_EMAILS
  });

  it('promotes to admin when the email is in ADMIN_EMAILS', async () => {
    vi.stubEnv('ADMIN_EMAILS', 'boss@applied.co');
    const token = await mint({ sub: 'identity-boss', email: 'boss@applied.co', name: 'Boss' });
    const res = await app.request('/api/auth/sso', { method: 'POST', headers: { 'x-user-token': token } });
    const body = await res.json() as { user: { role: string } };
    expect(body.user.role).toBe('admin');
  });

  it('401s without the header and 404s when SSO is disabled', async () => {
    const noHeader = await app.request('/api/auth/sso', { method: 'POST' });
    expect(noHeader.status).toBe(401);
    delete process.env.USER_TOKEN_ISSUER;
    const disabled = await app.request('/api/auth/sso', { method: 'POST', headers: { 'x-user-token': 'x' } });
    expect(disabled.status).toBe(404);
    process.env.USER_TOKEN_ISSUER = ISSUER; // restore for other tests
  });
});
