import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { loadContent } from './content.js';
import type { ContentBundle } from 'tet-core';

const Ctx = createContext<ContentBundle | null>(null);

export function ContentProvider({ children, seed }: {
  children: ReactNode;
  /** Dependency-injection seam (tests): skip the fetch and use this bundle directly. */
  seed?: ContentBundle;
}) {
  const [bundle, setBundle] = useState<ContentBundle | null>(seed ?? null);
  const [error, setError] = useState<Error | null>(null);
  // Bumped by Retry to re-run the load effect (loadContent itself is
  // retry-safe: only successes are cached, so a failed fetch is re-fetched).
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (seed) return;
    let alive = true;
    void loadContent()
      .then((b) => { if (alive) { setBundle(b); setError(null); } })
      .catch((err: unknown) => {
        if (alive) setError(err instanceof Error ? err : new Error(String(err)));
      });
    return () => { alive = false; };
  }, [seed, attempt]);
  // Failure path (M5 Task 1): a missing or corrupt content.json used to leave
  // "Loading curriculum…" up forever. Now the failure is announced (role=alert)
  // with the stage that failed (fetch vs. parse, from loadContent's message)
  // and a Retry button; the card stays up until a retry succeeds.
  if (error) {
    return (
      <section className="card" role="alert">
        <h1>The curriculum failed to load</h1>
        <p className="muted">{error.message}</p>
        <button className="btn" onClick={() => setAttempt((n) => n + 1)}>Retry</button>
      </section>
    );
  }
  if (!bundle) return <p className="muted">Loading curriculum…</p>;
  return <Ctx.Provider value={bundle}>{children}</Ctx.Provider>;
}

export function useContent(): ContentBundle {
  const b = useContext(Ctx);
  if (!b) throw new Error('useContent outside ContentProvider');
  return b;
}
