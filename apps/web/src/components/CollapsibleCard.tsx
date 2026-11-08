import { useEffect, useState, type ReactNode } from 'react';

/**
 * A card whose body collapses to its header. State persists per key in
 * localStorage ('tet.card.<key>') so a section you leave open stays open.
 * Default on first visit: collapsed.
 */
export function CollapsibleCard({ title, storageKey, summary, defaultOpen = false, children }: {
  title: string;
  /** Unique persistence key, e.g. "module:m1:lessons". */
  storageKey: string;
  /** Small right-aligned summary shown in the header when collapsed. */
  summary?: ReactNode;
  /** State when the key is absent from localStorage (default: collapsed). */
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const key = `tet.card.${storageKey}`;
  const [open, setOpen] = useState<boolean>(() => {
    const stored = localStorage.getItem(key);
    if (stored === 'open') return true;
    if (stored === 'closed') return false;
    return defaultOpen;
  });
  const [mounted, setMounted] = useState(false);

  // Persist from the first interaction onward (first visit = collapsed default).
  useEffect(() => {
    if (mounted) localStorage.setItem(key, open ? 'open' : 'closed');
  }, [key, open, mounted]);

  return (
    <section className="card collapsible">
      <h2 style={{ margin: 0 }}>
        <button
          className="collapse-header"
          aria-expanded={open}
          onClick={() => { setMounted(true); setOpen((o) => !o); }}
        >
          <span className={`chevron${open ? ' open' : ''}`} aria-hidden="true">▸</span>
          <span>{title}</span>
          {!open && summary && <span className="muted collapse-summary">{summary}</span>}
        </button>
      </h2>
      {open && <div className="collapse-body">{children}</div>}
    </section>
  );
}
