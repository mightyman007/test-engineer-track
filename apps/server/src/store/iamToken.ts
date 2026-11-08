/**
 * AlloyDB IAM auth (M7): Dana injects PGHOST/PGPORT/PGDATABASE/PGUSER but no
 * password — the database password IS a GCP access token fetched from the
 * instance metadata server. Tokens expire (~1h), so they are fetched per
 * connection attempt via the provider below and never used past their life.
 */

const METADATA_URL =
  'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token';

export interface IamToken {
  accessToken: string;
  /** Absolute epoch ms when the token stops being valid. */
  expiresAt: number;
}

/** One metadata-server token fetch. Injectable fetch keeps tests offline. */
export async function fetchIamToken(fetchLike: typeof fetch = fetch): Promise<IamToken> {
  const res = await fetchLike(METADATA_URL, { headers: { 'Metadata-Flavor': 'Google' } });
  if (!res.ok) throw new Error(`metadata token request failed: ${res.status}`);
  const body = (await res.json()) as { access_token?: unknown; expires_in?: unknown };
  if (typeof body.access_token !== 'string' || body.access_token === '') {
    throw new Error('metadata token response has no access_token');
  }
  const expiresIn = typeof body.expires_in === 'number' && body.expires_in > 0 ? body.expires_in : 3600;
  return { accessToken: body.access_token, expiresAt: Date.now() + expiresIn * 1000 };
}

export interface IamTokenProviderOptions {
  fetchLike?: typeof fetch;
  /** Refresh this long before the cached token actually expires. */
  marginMs?: number;
  now?: () => number;
}

/**
 * Password callback for the pg pool: hands back a cached access token until
 * shortly before its expiry, then refetches. `invalidate()` drops the cache —
 * called when a connection fails so the next attempt mints a fresh token.
 */
export function createIamTokenProvider(options: IamTokenProviderOptions = {}): {
  password: () => Promise<string>;
  invalidate: () => void;
} {
  const fetchLike = options.fetchLike ?? fetch;
  const marginMs = options.marginMs ?? 60_000;
  const now = options.now ?? Date.now;
  let cached: IamToken | null = null;
  return {
    async password(): Promise<string> {
      if (cached && now() < cached.expiresAt - marginMs) return cached.accessToken;
      const token = await fetchIamToken(fetchLike);
      cached = token;
      return token.accessToken;
    },
    invalidate(): void {
      cached = null;
    },
  };
}
