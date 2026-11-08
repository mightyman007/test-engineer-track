import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { createLocalAdapter, createServerAdapter, type SessionInfo, type StorageAdapter } from 'tet-storage';

export interface SessionCtx {
  session: SessionInfo | null;
  adapter: StorageAdapter;
  /** Set by ServerAdapter's 401 hook; Layout shows a "session expired" banner until cleared. */
  authExpired: boolean;
  clearAuthExpired: () => void;
  refresh: () => Promise<void>;
  connectCohort: (serverUrl: string) => Promise<void>;
  /** POST /api/auth/register (credentials include), then connectCohort(url). */
  registerCohort: (serverUrl: string, payload: {
    inviteCode: string; username: string; displayName: string; password: string;
  }) => Promise<void>;
  disconnect: () => Promise<void>;
}

const Ctx = createContext<SessionCtx | null>(null);

export function SessionProvider({ children, adapter: injected }: {
  children: ReactNode;
  /** Dependency-injection seam (tests): mount with a stub adapter instead of IndexedDB. */
  adapter?: StorageAdapter;
}) {
  const [adapter, setAdapter] = useState<StorageAdapter>(() => injected ?? createLocalAdapter());
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [authExpired, setAuthExpired] = useState(false);
  /** Mirrors `adapter` so callbacks (disconnect) always act on the current one. */
  const adapterRef = useRef(adapter);
  /** Base URL of the server the current adapter was connected to (null = solo). */
  const cohortServerRef = useRef<string | null>(null);

  useEffect(() => {
    adapterRef.current = adapter;
    // alive-guard: a still-pending OLD adapter's getSession() must never
    // clobber the session after an adapter swap (e.g. connectCohort already
    // set the cohort session).
    let alive = true;
    void adapter.getSession()
      .then((s) => { if (alive) setSession(s); })
      .catch(() => { /* leave signed-out gracefully */ });
    return () => { alive = false; };
  }, [adapter]);

  // One-time same-origin SSO attempt (non-local hosts = a Dana deployment,
  // where the edge injects X-User-Token into every browser request): a 200
  // from /api/auth/sso means the visitor's Applied/okta-ext identity is their
  // app account — connect in cohort mode with zero configuration.
  useEffect(() => {
    let alive = true;
    void (async () => {
      if (/^(localhost|127\.0\.0\.1)$/.test(window.location.hostname)) return;
      try {
        const res = await fetch('/api/auth/sso', { method: 'POST', credentials: 'include' });
        if (!res.ok) return;
        const next = createServerAdapter({
          serverUrl: window.location.origin,
          onUnauthorized: () => { setAuthExpired(true); return Promise.resolve(); },
        });
        const s = await next.getSession();
        if (!s || !alive) return;
        adapterRef.current = next;
        setAdapter(next);
        setSession(s);
        setAuthExpired(false);
      } catch { /* fall through to solo */ }
    })();
    return () => { alive = false; };
    // One-time: the platform identity does not change mid-session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Swaps the live adapter and its mirror ref in one step. */
  function swapAdapter(next: StorageAdapter) {
    adapterRef.current = next;
    setAdapter(next);
  }

  const ctx: SessionCtx = {
    adapter,
    session,
    authExpired,
    clearAuthExpired: () => setAuthExpired(false),
    refresh: async () => setSession(await adapter.getSession()),
    connectCohort: async (serverUrl: string) => {
      const base = serverUrl.replace(/\/$/, '');
      const current = adapterRef.current;
      // Probe the live adapter first: a cohort session for THIS server means
      // the adapter must be REUSED — its replay buffer holds writes (exam
      // submits, progress) recorded during an expired window, and replacing
      // the adapter would orphan them, never to be replayed.
      const probe = await current.getSession().catch(() => null);
      if (probe?.mode === 'cohort' && probe.serverUrl === base) {
        cohortServerRef.current = base;
        setSession(probe);
        setAuthExpired(false);
        return;
      }
      if (cohortServerRef.current === base) {
        // Same server, but the probe read failed (expired session or network):
        // still reuse the adapter so its buffer survives; the re-probe runs
        // the 401 re-auth hook and fails below if sign-in does not stick.
        const s = await current.getSession();
        if (!s) throw new Error('Could not reach server or sign in');
        setSession(s);
        setAuthExpired(false);
        return;
      }
      if (probe?.mode === 'cohort' && current.pendingWrites?.()) {
        // Cross-server switch: the old buffer belongs to the OLD server's
        // cohort — replaying it against the new server would write one
        // cohort's data into another, so it is dropped (loudly) instead of
        // transferred.
        console.warn(
          `[tet] discarding ${current.pendingWrites?.()} buffered write(s) for ${probe.serverUrl}`,
          `— switching server to ${base}`,
        );
      }
      const next = createServerAdapter({
        serverUrl,
        onUnauthorized: () => { setAuthExpired(true); return Promise.resolve(); },
      });
      const s = await next.getSession();
      if (!s) throw new Error('Could not reach server or sign in');
      cohortServerRef.current = base;
      swapAdapter(next);
      setSession(s);
      setAuthExpired(false);
    },
    registerCohort: async (serverUrl: string, payload) => {
      // The register POST sets the auth cookie; connectCohort's /api/me then
      // reads it. Solo→cohort data migration is NOT part of this — it is a
      // separate one-time offer rendered by MigrationPrompt after connecting.
      const res = await fetch(`${serverUrl.replace(/\/$/, '')}/api/auth/register`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      await ctx.connectCohort(serverUrl);
    },
    disconnect: async () => {
      // Flush any buffered writes FIRST, while the session cookie is still
      // valid (an explicit drain instead of relying on the implicit one inside
      // getSession), then log out through the CURRENT adapter (cohort: POST
      // /api/auth/logout so the server cookie dies), then swap to a fresh
      // LocalAdapter and refresh — the solo session may be null until the
      // first visit. Best-effort: a network failure during logout must not
      // trap the user in cohort mode.
      await adapterRef.current.drainPending?.().catch(() => { /* drain is retried implicitly later */ });
      try {
        const current = await adapterRef.current.getSession();
        if (current?.mode === 'cohort' && current.serverUrl) {
          await fetch(`${current.serverUrl}/api/auth/logout`, { method: 'POST', credentials: 'include' });
        }
      } catch {
        // Proceed to solo mode regardless.
      }
      swapAdapter(createLocalAdapter());
      cohortServerRef.current = null;
      setSession(await adapterRef.current.getSession());
      setAuthExpired(false);
    },
  };

  return <Ctx.Provider value={ctx}>{children}</Ctx.Provider>;
}

export function useSession(): SessionCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useSession outside SessionProvider');
  return ctx;
}
