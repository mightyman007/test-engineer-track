import { useEffect, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router';
import { useSession } from '../state/session.js';
import { useContent } from '../lib/content-context.js';
import { applyStoredTheme, getTheme, toggleTheme, type Theme } from '../lib/theme.js';
import { overallLessonProgress } from 'tet-core';
import { ProgressBar } from './ProgressBar.js';

function ModuleDot({ done, total }: { done: number; total: number }) {
  if (done >= total && total > 0) return <span className="dot done" aria-label="module complete" />;
  if (done > 0) return <span className="dot started" aria-label={`${done} of ${total} lessons complete`} />;
  return <span className="dot" />;
}

/** Track ids the user has expanded in the rail, persisted in localStorage. */
function loadExpanded(): Set<string> {
  try {
    const raw = localStorage.getItem('tet.rail.expanded');
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

function saveExpanded(set: Set<string>): void {
  try { localStorage.setItem('tet.rail.expanded', JSON.stringify([...set])); } catch { /* private mode */ }
}

export function Layout({ children }: { children: ReactNode }) {
  const { session, authExpired, adapter } = useSession();
  const bundle = useContent();
  const { pathname } = useLocation();
  const [theme, setThemeState] = useState<Theme>(getTheme);
  const [progress, setProgress] = useState<Record<string, { status: string }>>({});
  const [expanded, setExpanded] = useState<Set<string>>(() => loadExpanded());
  const flip = () => setThemeState(toggleTheme());

  useEffect(() => { applyStoredTheme(); }, []);

  // One progress fetch feeds the rail dots AND the global top bar.
  useEffect(() => {
    let alive = true;
    void adapter.getProgress().then((p) => { if (alive) setProgress(p); }).catch(() => {});
    return () => { alive = false; };
  }, [adapter, pathname]);

  const overall = overallLessonProgress(bundle, progress);

  function toggleTrack(trackId: string): void {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(trackId)) next.delete(trackId); else next.add(trackId);
      saveExpanded(next);
      return next;
    });
  }

  const active = (path: string) => (pathname === path ? ' rail-active' : '');

  return (
    <div className="shell">
      <nav className="rail" aria-label="Main navigation">
        <Link to="/" className="rail-brand">Test Engineer Track</Link>
        <div className="rail-nav">
          <Link to="/" className={`rail-link${active('/')}`}>Dashboard</Link>
          {bundle.tracks.map((track) => {
            const isOpen = expanded.has(track.id);
            const doneInTrack = track.modules.reduce((n, m) =>
              n + m.lessonIds.filter((lid) => progress[`${track.id}/${m.id}/${lid}`]?.status === 'done').length, 0);
            const totalInTrack = track.modules.reduce((n, m) => n + m.lessonIds.length, 0);
            return (
              <div className="rail-track" key={track.id}>
                <div className="rail-track-head">
                  <button
                    className="rail-collapse"
                    aria-expanded={isOpen}
                    aria-label={`${isOpen ? 'Collapse' : 'Expand'} ${track.title} modules`}
                    onClick={() => toggleTrack(track.id)}
                  >
                    <span className={`chevron${isOpen ? ' open' : ''}`} aria-hidden="true">▸</span>
                  </button>
                  <Link to={`/track/${track.id}`} className={`rail-track-title${active(`/track/${track.id}`)}`}>
                    {track.title}
                  </Link>
                  <span className="rail-count">{doneInTrack}/{totalInTrack}</span>
                </div>
                {isOpen && (
                  <ul className="rail-modules">
                    {track.modules.map((m) => {
                      const done = m.lessonIds.filter(
                        (lid) => progress[`${track.id}/${m.id}/${lid}`]?.status === 'done',
                      ).length;
                      return (
                        <li key={m.id}>
                          <ModuleDot done={done} total={m.lessonIds.length} />
                          <Link
                            to={`/module/${m.id}`}
                            className={`rail-module${pathname === `/module/${m.id}` ? ' rail-active' : ''}`}
                          >
                            {m.title}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })}
          <Link to="/flashcards" className={`rail-link${active('/flashcards')}`}>Flashcards</Link>
          {session?.role === 'admin' && (
            <Link to="/admin" className={`rail-link${active('/admin')}`}>Admin</Link>
          )}
        </div>
        <div className="rail-footer">
          <span className="muted">
            {session ? (session.mode === 'cohort' ? `cohort · ${session.displayName}` : 'solo mode') : 'solo mode'}
          </span>
          <div className="rail-footer-row">
            <button
              className="btn secondary"
              style={{ padding: '0.25rem 0.6rem', fontSize: '0.9rem' }}
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              onClick={flip}
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
            {(!session || session.mode !== 'cohort') && <Link to="/login">Sign in</Link>}
          </div>
        </div>
      </nav>
      <div className="content-col">
        <div className="topbar" role="status" aria-label="Overall progress">
          <ProgressBar
            fraction={overall.total > 0 ? overall.done / overall.total : 0}
            label={`Overall · ${overall.done}/${overall.total} lessons · ${Math.round(overall.pct)}%`}
          />
        </div>
        {authExpired && (
          <div className="card" style={{ margin: '1rem auto 0', maxWidth: 760, borderColor: 'var(--warn)' }}>
            <strong>Session expired.</strong>{' '}
            <Link to="/login">Sign in again</Link> — your in-progress exam answers are saved locally and will sync after re-auth.
          </div>
        )}
        <main className="container">{children}</main>
      </div>
    </div>
  );
}
