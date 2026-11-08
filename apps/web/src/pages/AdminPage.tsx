import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { useSession, type SessionCtx } from '../state/session.js';

interface RosterRow {
  id: number; username: string; displayName: string; role: string; lastSeenAt: string | null;
  quizAttempts: number; bestQuizPct: number | null; examAttempts: number;
  bestExamPct: number | null; cardsTracked: number; cardsReviewed: number;
}

/** Payload for POST /api/admin/users. */
interface NewUser { username: string; displayName: string; password: string; role: 'admin' | 'learner' }

async function jsonFetch<T>(url: string, init: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: 'include', ...init,
    headers: { 'content-type': 'application/json', ...(init.headers ?? {}) } });
  if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
  // Empty bodies (the password reset returns 204) have no JSON to parse.
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

/**
 * Admin dashboard: account management (create-user form, per-roster-row
 * password reset), roster with per-user stats, invite creation, CSV export
 * (cookie-authenticated browser navigation), and leaving the cohort. The
 * admin gate is a render gate only — hooks above run unconditionally, since
 * the session arrives asynchronously and a gate before hooks would change
 * hook count between renders.
 */
export function AdminPage({ ctx: injected, rosterLoader, inviteCreator, userCreator, passwordResetter }: {
  ctx?: SessionCtx;
  rosterLoader?: () => Promise<{ users: RosterRow[] }>;
  inviteCreator?: () => Promise<{ code: string }>;
  userCreator?: (payload: NewUser) => Promise<{ user: { id: number; username: string; role: string } }>;
  passwordResetter?: (userId: number, password: string) => Promise<void>;
}) {
  // Lazy like LoginPage: useSession() runs only when no ctx is injected.
  const real = injected ?? useSession();
  const { session } = real;
  const [roster, setRoster] = useState<{ users: RosterRow[] } | null>(null);
  const [newCode, setNewCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'admin' | 'learner'>('learner');
  const [resetFor, setResetFor] = useState<number | null>(null);
  const [resetPw, setResetPw] = useState('');
  const [resetConfirm, setResetConfirm] = useState('');
  const isAdmin = session?.role === 'admin';
  const serverUrl = (session?.serverUrl ?? '').replace(/\/$/, '');

  const createUserRequest = userCreator ?? (async (payload: NewUser) =>
    jsonFetch<{ user: { id: number; username: string; role: string } }>(`${serverUrl}/api/admin/users`, {
      method: 'POST', body: JSON.stringify(payload) }));
  const resetUserPassword = passwordResetter ?? (async (userId: number, pw: string) => {
    await jsonFetch<unknown>(`${serverUrl}/api/admin/users/${userId}/password`, {
      method: 'POST', body: JSON.stringify({ password: pw }) });
  });

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

  async function createUser(e: FormEvent) {
    e.preventDefault();
    setError('');
    setNotice('');
    try {
      const res = await createUserRequest({ username, displayName, password, role });
      setNotice(`Account created: ${res.user.username}`);
      setUsername(''); setDisplayName(''); setPassword(''); setRole('learner');
      setShowCreate(false);
    } catch (err) { setError(String(err)); }
  }

  function startReset(u: RosterRow) {
    setResetFor(u.id);
    setResetPw('');
    setResetConfirm('');
    setError('');
    setNotice('');
  }

  async function savePassword(u: RosterRow) {
    // The confirm field is optional (the server treats the new password as
    // authoritative); a filled confirm must match before we send.
    if (resetConfirm && resetConfirm !== resetPw) { setError('passwords do not match'); return; }
    setError('');
    setNotice('');
    try {
      await resetUserPassword(u.id, resetPw);
      setNotice('password updated');
      setResetFor(null); setResetPw(''); setResetConfirm('');
    } catch (err) { setError(String(err)); }
  }

  return (
    <div>
      <h1>Admin</h1>
      {error && <p className="flag warn" role="alert">{error}</p>}
      {notice && <p className="flag ok" role="status">{notice}</p>}
      <h2>Accounts</h2>
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
      <p><button className="btn" onClick={() => setShowCreate(true)}>New account</button></p>
      {showCreate && (
        <form onSubmit={(e) => void createUser(e)} style={{ display: 'grid', gap: '0.5rem', maxWidth: '24rem', marginBlock: '0.75rem' }}>
          <label>Username <input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="off" /></label>
          <label>Display name <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} autoComplete="off" /></label>
          <label>Password <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" /></label>
          <label>Role{' '}
            <select value={role} onChange={(e) => setRole(e.target.value as 'admin' | 'learner')}>
              <option value="learner">learner</option>
              <option value="admin">admin</option>
            </select>
          </label>
          <p><button className="btn" type="submit">Create account</button></p>
        </form>
      )}
      <h2>People</h2>
      <table style={{ width: '100%', borderCollapse: 'collapse' }} className="card">
        <thead>
          <tr style={{ textAlign: 'left' }}>
            <th>learner</th><th>last seen</th><th>quizzes</th><th>best quiz</th>
            <th>exams</th><th>best exam</th><th>cards</th><th>reviews</th><th>actions</th>
          </tr>
        </thead>
        <tbody>
          {(roster?.users ?? []).map((u) => (
            <tr key={u.id} style={{ borderTop: '1px solid var(--border-soft)' }}>
              <td>{u.displayName} <span className="muted">(<span>{u.username}</span>{u.role === 'admin' ? ', admin' : ''})</span></td>
              <td className="muted">{u.lastSeenAt ? new Date(u.lastSeenAt).toLocaleString() : 'never'}</td>
              <td>{u.quizAttempts}</td>
              <td>{u.bestQuizPct === null ? '—' : `${u.bestQuizPct}%`}</td>
              <td>{u.examAttempts}</td>
              <td>{u.bestExamPct === null ? '—' : `${u.bestExamPct}%`}</td>
              <td>{u.cardsTracked}</td>
              <td>{u.cardsReviewed}</td>
              <td>
                {resetFor === u.id ? (
                  <span style={{ display: 'inline-flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <label>New password <input type="password" value={resetPw} onChange={(e) => setResetPw(e.target.value)} autoComplete="new-password" /></label>
                    <label>Confirm <input type="password" value={resetConfirm} onChange={(e) => setResetConfirm(e.target.value)} autoComplete="new-password" /></label>
                    <button className="btn" onClick={() => void savePassword(u)}>Save password</button>
                  </span>
                ) : (
                  <button className="btn secondary" onClick={() => startReset(u)}>Reset password</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p><button className="btn secondary" onClick={() => void real.disconnect()}>Leave cohort (back to solo)</button></p>
      <p className="muted"><Link to="/">← Dashboard</Link></p>
    </div>
  );
}
