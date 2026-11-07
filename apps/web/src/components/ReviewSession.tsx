import { useEffect, useMemo, useState } from 'react';
import { newCardState, reviewCard, type CardState, type Grade } from 'tet-core';
import type { Flashcard } from 'tet-core';
import { useSession } from '../state/session.js';

const GRADES: { key: Grade; label: string; hint: string }[] = [
  { key: 'again', label: 'Again', hint: 'reset' },
  { key: 'hard', label: 'Hard', hint: '×1.2' },
  { key: 'good', label: 'Good', hint: 'normal' },
  { key: 'easy', label: 'Easy', hint: 'faster' },
];

export function ReviewSession({ cardIds, cards }: { cardIds: string[]; cards: Flashcard[] }) {
  const { adapter } = useSession();
  const [states, setStates] = useState<Record<string, CardState> | null>(null);
  const [queue, setQueue] = useState<string[]>([]);
  const [flipped, setFlipped] = useState(false);

  const byId = useMemo(() => new Map(cards.map((c) => [c.id, c])), [cards]);

  useEffect(() => {
    void (async () => {
      const existing = await adapter.getReviewState();
      const now = Date.now();
      const due = cardIds.filter((id) => {
        const s = existing[id];
        return !s || new Date(s.dueAt).getTime() <= now;
      });
      setStates(existing);
      setQueue(due);
    })();
  }, [adapter, cardIds]);

  if (!states) return <p className="muted">Loading…</p>;

  if (queue.length === 0) {
    return <p className="flag ok">session complete — next cards are scheduled for future days.</p>;
  }

  const currentId = queue[0]!;
  const card = byId.get(currentId)!;
  const state = states[currentId] ?? newCardState();

  async function grade(g: Grade) {
    const next = reviewCard(state, g, new Date());
    const createdAt = new Date().toISOString();
    setStates((s) => ({ ...(s ?? {}), [currentId]: next }));
    setQueue((qu) => qu.slice(1));
    setFlipped(false);
    // Optimistic UI already advanced; a failed review write is logged — the
    // card's state on the server stays at its previous schedule (retryable by
    // re-reviewing when it comes due).
    await adapter.recordCardReview({ cardId: currentId, grade: g, state: next, createdAt })
      .catch((err) => console.error('[tet] card review not recorded:', err));
  }

  return (
    <div>
      <p className="muted">{queue.length} card{queue.length === 1 ? '' : 's'} to review</p>
      <div className="card" style={{ minHeight: 160, cursor: 'pointer' }} onClick={() => setFlipped(true)}>
        {!flipped
          ? <h3 style={{ margin: 0 }}>{card.front}</h3>
          : (
            <div>
              <h3 style={{ margin: 0 }}>{card.front}</h3>
              <hr />
              <p style={{ marginBottom: 0 }}>{card.back}</p>
            </div>
          )}
      </div>
      {flipped && (
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {GRADES.map((g) => (
            <button key={g.key} className="btn secondary" onClick={() => void grade(g.key)}>
              {g.label} <span className="muted">({g.hint})</span>
            </button>
          ))}
        </div>
      )}
      {!flipped && <p className="muted">click the card to reveal the answer</p>}
    </div>
  );
}
