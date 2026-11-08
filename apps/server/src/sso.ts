import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';

export interface SsoIdentity {
  /** Stable platform identity (the token's `sub`). */
  identityId: string;
  email?: string;
  displayName?: string;
}

interface CachedConfig {
  issuer: string;
  jwks: ReturnType<typeof createRemoteJWKSet>;
  fetchedAt: number;
}

let cached: CachedConfig | null = null;
const CACHE_MS = 10 * 60_000;

/**
 * Resolve the platform's token issuer + JWKS from the injected
 * USER_TOKEN_ISSUER env (an OIDC discovery document on a public GCS bucket).
 * Cached for 10 minutes; failures are not cached.
 */
async function discover(): Promise<CachedConfig> {
  if (cached && Date.now() - cached.fetchedAt < CACHE_MS) return cached;
  const issuer = process.env.USER_TOKEN_ISSUER;
  if (!issuer) throw new Error('USER_TOKEN_ISSUER not set — SSO disabled');
  const res = await fetch(`${issuer}/.well-known/openid-configuration`);
  if (!res.ok) throw new Error(`oidc discovery failed: ${res.status}`);
  const cfg = (await res.json()) as { issuer: string; jwks_uri: string };
  if (cfg.issuer !== issuer) throw new Error(`issuer mismatch: discovery says ${cfg.issuer}`);
  return (cached = { issuer, jwks: createRemoteJWKSet(new URL(cfg.jwks_uri)), fetchedAt: Date.now() });
}

/** Verify an X-User-Token JWT against the platform's published keys. */
export async function verifyUserToken(token: string): Promise<SsoIdentity> {
  const { issuer, jwks } = await discover();
  const { payload } = await jwtVerify(token, jwks, { issuer, algorithms: ['RS256'] });
  return identityFromClaims(payload);
}

export function identityFromClaims(payload: JWTPayload): SsoIdentity {
  const identityId = payload.sub;
  if (!identityId) throw new Error('token has no subject');
  const email = typeof payload.email === 'string' ? payload.email : undefined;
  const displayName =
    (typeof payload.name === 'string' && payload.name) ||
    (typeof payload.preferred_username === 'string' && payload.preferred_username) ||
    email || undefined;
  return { identityId, email, displayName };
}

/** SSO is active only when the deployment opts in (Dana sets the issuer env). */
export function ssoEnabled(): boolean {
  return Boolean(process.env.USER_TOKEN_ISSUER);
}

/** Comma-separated ADMIN_EMAILS env → role promotion on SSO provision. */
export function adminEmails(): Set<string> {
  return new Set((process.env.ADMIN_EMAILS ?? '')
    .split(',').map((s) => s.trim().toLowerCase()).filter(Boolean));
}
