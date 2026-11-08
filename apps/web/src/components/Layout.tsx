import { useEffect, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router';
import { useSession } from '../state/session.js';
import { useContent } from '../lib/content-context.js';
import { applyStoredTheme, getTheme, toggleTheme, type Theme } from '../lib/theme.js';

function ModuleDot({ done, total }: { done: number; total: number }) {
  if (done >= total && total > 0) return <span className="dot done" aria-label="module complete" />;
  if (done > 0) return <span className="dot started" aria-label={`${done} of ${total} lessons complete`} />;
  return <span className="dot" />;
}

export function Layout({ children }: { children: ReactNode }) {
  const { session, authExpired, adapter } = useSession();
  const bundle = useContent();
  const { pathname } = useLocation();
  const [theme, setThemeState] = useState<Theme>(getTheme);
  const [progress, setProgress] = useState<Record<string, { status: string }>>({});
  const flip = () => setThemeState(toggleTheme());

  // Re-assert the stored theme on mount: keeps the document attribute honest
  // whenever Layout mounts (the index.html pre-paint script covers first
  // paint; this covers every other entry, including tests).
  useEffect(() => { applyStoredTheme(); }, []);

  // The rail's per-module progress dots read the same progress map the pages use.
  useEffect(() => {
    let alive = true;
    void adapter.getProgress().then((p) => { if (alive) setProgress(p); }).catch(() => {});
    return () => { alive = false; };
  }, [adapter, pathname]);

  const active = (path: string) => (pathname === path ? ' rail-active' : '');

  return (
    <div className="shell">
      <nav className="rail" aria-label="Main navigation">
        <Link to="/" className="rail-brand">Test Engineer Track</Link>
        <nav className="rail-nav">
          <Link to="/" className={`rail-link${active('/')}`}>Dashboard</Link>
          {bundle.tracks.map((track) => (
            <div className="rail-track" key={track.id}>
              <Link to={`/track/${track.id}`} className={`rail-track-title${active(`/track/${track.id}`)}`}>
                {track.title}
              </Link>
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
            </div>
          ))}
          <Link to="/flashcards" className={`rail-link${active('/flashcards')}`}>Flashcards</Link>
          {session?.role === 'admin' && (
            <Link to="/admin" className={`rail-link${active('/admin')}`}>Admin</Link>
          )}
        </nav>
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
