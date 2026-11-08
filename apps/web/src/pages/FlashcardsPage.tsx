import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { useContent } from '../lib/content-context.js';
import { useSession } from '../state/session.js';
import { ReviewSession } from '../components/ReviewSession.js';

export function FlashcardsPage() {
  const { moduleId } = useParams();
  const bundle = useContent();
  const { adapter } = useSession();
  const [states, setStates] = useState<Record<string, { dueAt: string }> | null>(null);

  useEffect(() => {
    void adapter.getReviewState().then(setStates);
  }, [adapter]);

  if (!states) return <p className="muted">Loading…</p>;

  const now = Date.now();
  const dueIn = (ids: string[]) => ids.filter((id) => {
    const s = states[id];
    return !s || new Date(s.dueAt).getTime() <= now;
  }).length;

  const decks = bundle.tracks.flatMap((t) => t.modules.map((m) => ({ t, m })));
  const active = moduleId ? decks.find((d) => d.m.id === moduleId) : null;
  const cardIds = active
    ? (bundle.cardsByModule[active.m.id] ?? [])
    : decks.flatMap((d) => bundle.cardsByModule[d.m.id] ?? []);
  const cards = cardIds.map((id) => bundle.flashcards.find((c) => c.id === id)!).filter(Boolean);

  return (
    <div>
      <h1>Flashcards</h1>
      {!active && (
        <div className="grid" style={{ marginBottom: '1rem' }}>
          {/* Zero-card decks are hidden from the picker (M5 Task 1): module
              8's empty deck rendered "0 due · 0 total" — an unusable tile.
              Display-only: a zero-card module reached by deep link still
              serves its (empty) review session below. */}
          {decks.filter(({ m }) => (bundle.cardsByModule[m.id] ?? []).length > 0).map(({ t, m }) => {
            const ids = bundle.cardsByModule[m.id] ?? [];
            return (
              <Link key={m.id} to={`/flashcards/${m.id}`} className="card" style={{ textDecoration: 'none', color: 'inherit' }}>
                <strong>{m.title}</strong>
                <p className="muted">{dueIn(ids)} due · {ids.length} total</p>
              </Link>
            );
          })}
        </div>
      )}
      {active && <p className="muted"><Link to={`/module/${active.m.id}`}>← {active.m.title}</Link></p>}
      <ReviewSession cardIds={cardIds} cards={cards} />
    </div>
  );
}
