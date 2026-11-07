import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { useSession, type SessionCtx } from '../state/session.js';

interface RosterRow {
  id: number; username: string; displayName: string; role: string; lastSeenAt: string | null;
  quizAttempts: number; bestQuizPct: number | null; examAttempts: number;
  bestExamPct: number | null; cardsTracked: number;
}

async function jsonFetch<T>(url: string, init: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: 'include', ...init,
    headers: { 'content-type': 'application/json', ...(init.headers ?? {}) } });
  if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
  return await res.json() as T;
}

/**
 * Admin dashboard: roster with per-user stats, invite creation, CSV export
 * (cookie-authenticated browser navigation), and leaving the cohort. The
 * admin gate is a render gate only — hooks above run unconditionally, since
 * the session arrives asynchronously and a gate before hooks would change
 * hook count between renders.
 */
export function AdminPage({ ctx: injected, rosterLoader, inviteCreator }: {
  ctx?: SessionCtx;
  rosterLoader?: () => Promise<{ users: RosterRow[] }>;
  inviteCreator?: () => Promise<{ code: string }>;
}) {
  // Lazy like LoginPage: useSession() runs only when no ctx is injected.
  const real = injected ?? useSession();
  const { session } = real;
  const [roster, setRoster] = useState<{ users: RosterRow[] } | null>(null);
  const [newCode, setNewCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const isAdmin = session?.role === 'admin';
  const serverUrl = (session?.serverUrl ?? '').replace(/\/$/, '');

  useEffect(() => {
    if (!isAdmin) return;
    void (rosterLoader ?? (async () =>
      jsonFetch<{ users: RosterRow[] }>(`${serverUrl}/api/admin/roster`, { method: 'GET' })))()
      .then(setRoster).catch((e) => setError(String(e)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
    // Deps [isAdmin, serverUrl]: the session arrives AFTER mount on a hard
    // load of /admin (provider boot effect), so the first run exits early —
    // the effect must re-run once the admin session (and its serverUrl) land.
  }, [isAdmin, serverUrl]);

  if (!isAdmin) return <p className="muted">Admins only.</p>;

  async function makeInvite() {
    try {
      const res = await (inviteCreator ?? (async () =>
        jsonFetch<{ code: string }>(`${serverUrl}/api/admin/invites`, {
          method: 'POST', body: JSON.stringify({ usesLeft: 1 }),
        })))();
      setNewCode(res.code);
    } catch (e) { setError(String(e)); }
  }

  return (
    <div>
      <h1>Admin</h1>
      {error && <p className="flag warn">{error}</p>}
      <p>
        <a className="btn secondary" href={`${serverUrl}/api/admin/export.csv`} target="_blank" rel="noopener noreferrer">Export CSV</a>
        {' '}
        <button className="btn" onClick={() => void makeInvite()}>New invite</button>
        {newCode && (
          <span style={{ marginLeft: '0.75rem' }}>
            code: <code>{newCode}</code>{' '}
            <button className="btn secondary" onClick={async () => {
              try {
                await navigator.clipboard.writeText(newCode);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              } catch { /* clipboard unavailable (permissions) — code stays visible for manual copy */ }
            }}>{copied ? 'Copied!' : 'Copy'}</button>
          </span>
        )}
      </p>
      <table style={{ width: '100%', borderCollapse: 'collapse' }} className="card">
        <thead>
          <tr style={{ textAlign: 'left' }}>
            <th>learner</th><th>last seen</th><th>quizzes</th><th>best quiz</th>
            <th>exams</th><th>best exam</th><th>cards</th>
          </tr>
        </thead>
        <tbody>
          {(roster?.users ?? []).map((u) => (
            <tr key={u.id} style={{ borderTop: '1px solid #eceef3' }}>
              <td>{u.displayName} <span className="muted">(<span>{u.username}</span>{u.role === 'admin' ? ', admin' : ''})</span></td>
              <td className="muted">{u.lastSeenAt ? new Date(u.lastSeenAt).toLocaleString() : 'never'}</td>
              <td>{u.quizAttempts}</td>
              <td>{u.bestQuizPct === null ? '—' : `${u.bestQuizPct}%`}</td>
              <td>{u.examAttempts}</td>
              <td>{u.bestExamPct === null ? '—' : `${u.bestExamPct}%`}</td>
              <td>{u.cardsTracked}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p><button className="btn secondary" onClick={() => void real.disconnect()}>Leave cohort (back to solo)</button></p>
      <p className="muted"><Link to="/">← Dashboard</Link></p>
    </div>
  );
}
