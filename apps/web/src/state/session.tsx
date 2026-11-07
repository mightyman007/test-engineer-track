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
      const next = createServerAdapter({
        serverUrl,
        onUnauthorized: () => { setAuthExpired(true); return Promise.resolve(); },
      });
      const s = await next.getSession();
      if (!s) throw new Error('Could not reach server or sign in');
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
      // Log out through the CURRENT adapter first (cohort: POST /api/auth/logout
      // so the server cookie dies; ServerAdapter.getSession also drains any
      // buffered writes), then swap to a fresh LocalAdapter and refresh — the
      // solo session may be null until the first visit. Best-effort: a network
      // failure during logout must not trap the user in cohort mode.
      try {
        const current = await adapterRef.current.getSession();
        if (current?.mode === 'cohort' && current.serverUrl) {
          await fetch(`${current.serverUrl}/api/auth/logout`, { method: 'POST', credentials: 'include' });
        }
      } catch {
        // Proceed to solo mode regardless.
      }
      swapAdapter(createLocalAdapter());
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
