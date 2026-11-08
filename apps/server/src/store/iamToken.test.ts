import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { createIamTokenProvider, fetchIamToken } from './iamToken.js';

/** Stub metadata server: returns a token whose TTL the test controls. */
function metadataStub(log: number[], ttlSeconds: number, status = 200, body?: unknown): typeof fetch {
  return (async () => {
    log.push(Date.now());
    if (status !== 200) return new Response('forbidden', { status });
    return new Response(JSON.stringify(body ?? { access_token: 'tok-' + log.length, expires_in: ttlSeconds }), { status });
  }) as typeof fetch;
}

beforeEach(() => { vi.useFakeTimers({ now: 1_000_000 }); });
afterEach(() => { vi.useRealTimers(); });

describe('fetchIamToken', () => {
  it('hits the GCP metadata server with the Metadata-Flavor header', async () => {
    const seen: Array<{ url: string; flavor: string | null; signal: unknown }> = [];
    const fetchLike = (async (input: RequestInfo | URL, init?: RequestInit) => {
      seen.push({
        url: String(input),
        flavor: new Headers(init?.headers).get('Metadata-Flavor'),
        signal: init?.signal,
      });
      return new Response(JSON.stringify({ access_token: 'abc', expires_in: 3600 }), { status: 200 });
    }) as typeof fetch;
    const token = await fetchIamToken(fetchLike);
    expect(seen[0]!.url).toBe('http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token');
    expect(seen[0]!.flavor).toBe('Google');
    expect(seen[0]!.signal).toBeInstanceOf(AbortSignal); // the metadata fetch is time-bounded
    expect(token.accessToken).toBe('abc');
    expect(token.expiresAt).toBe(1_000_000 + 3600_000);
  });

  it('honors the GCE_METADATA_HOST override (google-auth convention)', async () => {
    vi.stubEnv('GCE_METADATA_HOST', '127.0.0.1:18081');
    const seen: string[] = [];
    const fetchLike = (async (input: RequestInfo | URL) => {
      seen.push(String(input));
      return new Response(JSON.stringify({ access_token: 'abc', expires_in: 3600 }), { status: 200 });
    }) as unknown as typeof fetch;
    await fetchIamToken(fetchLike);
    expect(seen[0]).toBe('http://127.0.0.1:18081/computeMetadata/v1/instance/service-accounts/default/token');
  });

  it('fails loudly on a non-200 or a token-less response', async () => {
    await expect(fetchIamToken(metadataStub([], 3600, 403))).rejects.toThrow(/failed: 403/);
    await expect(fetchIamToken(metadataStub([], 3600, 200, { expires_in: 3600 }))).rejects.toThrow(/no access_token/);
  });

  it('defaults the TTL when the metadata server omits expires_in', async () => {
    const token = await fetchIamToken(metadataStub([], 0, 200, { access_token: 't' }));
    expect(token.expiresAt).toBe(1_000_000 + 3600_000);
  });
});

describe('createIamTokenProvider (the pg pool password hook)', () => {
  it('serves a cached token within its life and refetches after expiry', async () => {
    const fetches: number[] = [];
    const provider = createIamTokenProvider({ fetchLike: metadataStub(fetches, 3600), marginMs: 60_000 });
    expect(await provider.password()).toBe('tok-1');
    vi.advanceTimersByTime(30 * 60_000); // halfway through the TTL
    expect(await provider.password()).toBe('tok-1'); // cached, no new fetch
    expect(fetches).toHaveLength(1);
    vi.advanceTimersByTime(31 * 60_000); // past expiry - margin
    expect(await provider.password()).toBe('tok-2'); // refreshed
    expect(fetches).toHaveLength(2);
  });

  it('never hands out a token inside the refresh margin', async () => {
    const fetches: number[] = [];
    const provider = createIamTokenProvider({ fetchLike: metadataStub(fetches, 30), marginMs: 60_000 });
    await provider.password(); // 30s TTL < 60s margin → cache can never be trusted
    await provider.password();
    expect(fetches).toHaveLength(2);
  });

  it('invalidate() drops the cache so the next connection mints a fresh token', async () => {
    const fetches: number[] = [];
    const provider = createIamTokenProvider({ fetchLike: metadataStub(fetches, 3600), marginMs: 60_000 });
    await provider.password();
    provider.invalidate();
    expect(await provider.password()).toBe('tok-2');
    expect(fetches).toHaveLength(2);
  });

  it('a failed fetch leaves no usable cache (next call retries)', async () => {
    let healthy = false;
    const fetches: number[] = [];
    const fetchLike = (async () => {
      fetches.push(1);
      if (!healthy) return new Response('nope', { status: 500 });
      return new Response(JSON.stringify({ access_token: 'good', expires_in: 3600 }), { status: 200 });
    }) as typeof fetch;
    const provider = createIamTokenProvider({ fetchLike, marginMs: 60_000 });
    await expect(provider.password()).rejects.toThrow(/failed: 500/);
    healthy = true;
    expect(await provider.password()).toBe('good');
    expect(fetches).toHaveLength(2);
  });
});
