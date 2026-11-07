import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useSession, type SessionCtx } from '../state/session.js';

/**
 * Cohort sign-in / registration. Two flows against a chosen server:
 * (a) sign in — a temporary POST /api/auth/login sets the cookie, then
 *     connectCohort(url) points the SessionProvider at a ServerAdapter whose
 *     /api/me reads that cookie;
 * (b) register with invite — delegated to SessionProvider.registerCohort
 *     (POST /api/auth/register → connectCohort); one-time solo→cohort data
 *     migration is offered afterwards by MigrationPrompt, not here.
 */
export function LoginPage({ ctx: injected }: { ctx?: SessionCtx }) {
  // Lazy: `??` only calls useSession() when no ctx is injected, so tests can
  // render this outside a SessionProvider. Hook usage stays consistent per
  // instance — an instance either always injects or never does.
  const real = injected ?? useSession();
  const { session, connectCohort, registerCohort } = real;
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [serverUrl, setServerUrl] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState('');

  async function signIn() {
    setError('');
    try {
      // The cookie must be set by the server before the adapter reads /api/me.
      // A network-level failure (unreachable server) is not fatal here — the
      // authoritative check is /api/me inside connectCohort, which surfaces
      // the same failure. An HTTP-level rejection (invalid credentials) throws.
      const res = await fetch(`${serverUrl.replace(/\/$/, '')}/api/auth/login`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, password }),
      }).catch(() => null);
      if (res && !res.ok) throw new Error(await res.text());
      await connectCohort(serverUrl);
      navigate('/');
    } catch (e) { setError(String(e)); }
  }

  async function register() {
    setError('');
    try {
      await registerCohort(serverUrl, { inviteCode, username, displayName, password });
      navigate('/');
    } catch (e) { setError(String(e)); }
  }

  return (
    <div className="card" style={{ maxWidth: 480, margin: '2rem auto' }}>
      <h1>{mode === 'login' ? 'Sign in to a cohort' : 'Register with an invite'}</h1>
      {session?.mode !== 'cohort' && (
        <p className="muted">You're in solo mode — progress stays in this browser until you sign in to a cohort.</p>
      )}
      <label style={{ display: 'block', marginBottom: '0.75rem' }}>
        Server URL
        <input style={{ width: '100%' }} value={serverUrl} onChange={(e) => setServerUrl(e.target.value)}
          placeholder="https://tet.example.com" aria-label="server url" />
      </label>
      <label style={{ display: 'block', marginBottom: '0.75rem' }}>
        Username
        <input style={{ width: '100%' }} value={username} onChange={(e) => setUsername(e.target.value)} aria-label="username" />
      </label>
      {mode === 'register' && (
        <>
          <label style={{ display: 'block', marginBottom: '0.75rem' }}>
            Invite code
            <input style={{ width: '100%' }} value={inviteCode} onChange={(e) => setInviteCode(e.target.value)} aria-label="invite code" />
          </label>
          <label style={{ display: 'block', marginBottom: '0.75rem' }}>
            Display name
            <input style={{ width: '100%' }} value={displayName} onChange={(e) => setDisplayName(e.target.value)} aria-label="display name" />
          </label>
        </>
      )}
      <label style={{ display: 'block', marginBottom: '0.75rem' }}>
        Password
        <input type="password" style={{ width: '100%' }} value={password} onChange={(e) => setPassword(e.target.value)} aria-label="password" />
      </label>
      {error && <p className="flag warn">{error}</p>}
      {mode === 'login'
        ? <button className="btn" onClick={signIn}>Sign in</button>
        : <button className="btn" onClick={register}>Create account</button>}
      {' '}
      <button className="btn secondary" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
        {mode === 'login' ? 'Register with invite' : 'Back to sign in'}
      </button>
    </div>
  );
}
