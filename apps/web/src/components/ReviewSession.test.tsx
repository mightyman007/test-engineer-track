import { describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { ReviewSession } from './ReviewSession.js';
import type { Flashcard } from 'tet-core';
import type { CardReview, StorageAdapter } from 'tet-storage';
import { SessionProvider } from '../state/session.js';

const cards: Flashcard[] = [
  { id: 'c1', front: 'What is a defect?', back: 'A flaw in a work product.', tags: ['ch1'] },
  { id: 'c2', front: 'What is a failure?', back: 'A deviation of observed behavior from expected.', tags: ['ch1'] },
];

const reviews: CardReview[] = [];
const adapter: Partial<StorageAdapter> = {
  // SessionProvider's boot effect calls getSession() before anything else.
  getSession: () => Promise.resolve(null),
  getReviewState: () => Promise.resolve({
    // c1 due yesterday; c2 scheduled far future → only c1 starts due
    c1: { ease: 2.5, intervalDays: 1, dueAt: new Date(Date.now() - 86_400_000).toISOString(), reps: 1, lapses: 0 },
    c2: { ease: 2.5, intervalDays: 30, dueAt: new Date(Date.now() + 30 * 86_400_000).toISOString(), reps: 3, lapses: 0 },
  }),
  recordCardReview: async (r) => { reviews.push(r); },
};

describe('ReviewSession', () => {
  it('queues only due/new cards and grades through SM-2 into the adapter', async () => {
    render(
      <SessionProvider adapter={adapter as StorageAdapter}>
        <ReviewSession cardIds={cards.map((c) => c.id)} cards={cards} />
      </SessionProvider>,
    );
    expect(await screen.findByText(/1 card to review/i)).toBeTruthy();
    // c2 is scheduled 30 days out: it must not be queued (ruling: prove the
    // exclusion, not just the count).
    expect(screen.queryByText('What is a failure?')).toBeNull();

    await userEvent.click(screen.getByText('What is a defect?')); // flip
    expect(screen.getByText(/flaw in a work product/i)).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: /good/i }));

    await waitFor(() => expect(reviews).toHaveLength(1));
    expect(reviews[0]!.cardId).toBe('c1');
    expect(reviews[0]!.grade).toBe('good');
    expect(reviews[0]!.state.intervalDays).toBe(6); // good from 1-day interval
    expect(new Date(reviews[0]!.state.dueAt).getTime()).toBeGreaterThan(Date.now());

    expect(await screen.findByText(/session complete/i)).toBeTruthy();
  });
});
