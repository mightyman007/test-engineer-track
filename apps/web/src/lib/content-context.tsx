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
  useEffect(() => {
    if (seed) return;
    let alive = true;
    void loadContent().then((b) => { if (alive) setBundle(b); });
    return () => { alive = false; };
  }, [seed]);
  if (!bundle) return <p className="muted">Loading curriculum…</p>;
  return <Ctx.Provider value={bundle}>{children}</Ctx.Provider>;
}

export function useContent(): ContentBundle {
  const b = useContext(Ctx);
  if (!b) throw new Error('useContent outside ContentProvider');
  return b;
}
