import { useEffect, useState } from 'react';
import { createLocalAdapter } from 'tet-storage';
import { useSession } from '../state/session.js';

/**
 * One-time solo→cohort migration offer. App renders it unconditionally; it
 * shows itself only in cohort mode while the `tet.migrated` flag is absent
 * AND the local browser actually has progress data. Upload re-exports from a
 * fresh LocalAdapter and POSTs to /api/import (server-side upserts make a
 * repeat upload idempotent); "Start fresh" just sets the flag. Either path
 * sets the flag, so the prompt never appears twice.
 */
export function MigrationPrompt() {
  const { session, refresh } = useSession();
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const cohort = session?.mode === 'cohort';

  useEffect(() => {
    if (!cohort) return;
    void (async () => {
      if (localStorage.getItem('tet.migrated')) return;
      const local = createLocalAdapter();
      const data = await local.exportAll();
      const hasData = Object.keys(data.progress).length > 0 || data.quizAttempts.length > 0 ||
        data.examAttempts.length > 0 || Object.keys(data.cardStates).length > 0;
      setShow(hasData);
    })();
  }, [cohort]);

  if (!cohort || !show) return null;
  // `show` gates the card: cohort mode alone is not enough — the offer
  // appears only when the local browser actually has progress worth
  // migrating, and stays down once either path has set the flag. (The state
  // existed but was never read: every cohort visit — even with nothing to
  // upload — showed the card. Found by this file's three-state tests.)
  const serverUrl = (session?.serverUrl ?? '').replace(/\/$/, '');

  return (
    <div className="card" style={{ borderColor: 'var(--accent)' }}>
      <strong>Bring my local progress into the cohort?</strong>
      <p className="muted">One-time upload of lessons read, quiz/exam scores, and flashcard scheduling from this browser.</p>
      <button className="btn" disabled={busy} onClick={async () => {
        setBusy(true);
        try {
          const local = createLocalAdapter();
          const data = await local.exportAll();
          const res = await fetch(`${serverUrl}/api/import`, {
            method: 'POST', credentials: 'include',
            headers: { 'content-type': 'application/json' }, body: JSON.stringify(data),
          });
          if (res.ok) { localStorage.setItem('tet.migrated', '1'); setShow(false); await refresh(); }
        } finally {
          // A failed upload keeps the prompt up (retry or start fresh); busy
          // must reset either way so the button never sticks disabled.
          setBusy(false);
        }
      }}>Upload progress</button>
      {' '}
      <button className="btn secondary" onClick={() => { localStorage.setItem('tet.migrated', '1'); setShow(false); }}>Start fresh</button>
    </div>
  );
}
