import { useEffect, type ReactNode, useState } from 'react';
import { Link } from 'react-router';
import { useSession } from '../state/session.js';
import { applyStoredTheme, getTheme, toggleTheme, type Theme } from '../lib/theme.js';

export function Layout({ children }: { children: ReactNode }) {
  const { session, authExpired } = useSession();
  const [theme, setThemeState] = useState<Theme>(getTheme);
  const flip = () => setThemeState(toggleTheme());
  // Re-assert the stored theme on mount: keeps the document attribute honest
  // whenever Layout mounts (the index.html pre-paint script covers first
  // paint; this covers every other entry, including tests).
  useEffect(() => { applyStoredTheme(); }, []);
  return (
    <>
      <header className="card" style={{ margin: 0, borderRadius: 0 }}>
        <nav style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <Link to="/"><strong>Test Engineer Track</strong></Link>
          <Link to="/flashcards">Flashcards</Link>
          {session?.role === 'admin' && <Link to="/admin">Admin</Link>}
          <span className="muted" style={{ marginLeft: 'auto' }}>
            {session ? (session.mode === 'cohort' ? `cohort · ${session.displayName}` : 'solo mode') : 'solo mode'}
          </span>
          <button
            className="btn secondary"
            style={{ padding: '0.25rem 0.6rem', fontSize: '0.9rem' }}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            onClick={flip}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          {/* Cohort sign-in lives at /login; solo users must be able to reach it
              from the nav — on static hosting deep links may not be entry points. */}
          {(!session || session.mode !== 'cohort') && <Link to="/login">Sign in</Link>}
        </nav>
      </header>
      {authExpired && (
        <div className="card" style={{ margin: '1rem auto 0', maxWidth: 760, borderColor: 'var(--warn)' }}>
          <strong>Session expired.</strong>{' '}
          <Link to="/login">Sign in again</Link> — your in-progress exam answers are saved locally and will sync after re-auth.
        </div>
      )}
      <main className="container">{children}</main>
    </>
  );
}
