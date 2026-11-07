import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { QuizRunner } from './QuizRunner.js';
import { ContentProvider } from '../lib/content-context.js';
import { SessionProvider } from '../state/session.js';
import type { ContentBundle, Question } from 'tet-core';
import type { QuizAttempt, StorageAdapter } from 'tet-storage';

const q1: Question = {
  id: 'q1', type: 'single', stem: 'What is 2+2?', options: ['3', '4', '5', '6'],
  answers: [1], explanation: '2+2=4', tags: ['ch1'], klevel: 'K1',
};
const q2: Question = {
  id: 'q2', type: 'multi', stem: 'Pick TWO primes', options: ['2', '3', '4', '5', '6'],
  answers: [0, 1], explanation: '2 and 3 are prime', tags: ['ch1'], klevel: 'K2',
};

const bundle: ContentBundle = {
  tracks: [{ id: 't1', title: 'T', description: 'D', order: 1,
    modules: [{ id: 'm1', track: 't1', title: 'M1', order: 1, source: 'x', quizPool: 'x', deck: 'x', lessonIds: [] }],
    readiness: { examIds: [], passPct: 65, readyPct: 80 } }],
  lessons: {}, questions: [q1, q2], flashcards: [], exams: [], diagrams: {},
  questionsByModule: { m1: ['q1', 'q2'] }, cardsByModule: {},
};

const attempts: QuizAttempt[] = [];
const adapter: Partial<StorageAdapter> = {
  getSession: () => Promise.resolve(null),
  recordQuizAttempt: async (a) => { attempts.push(a); },
  getQuizAttempts: () => Promise.resolve(attempts),
};

// The quiz draw is seeded from Date.now(); pin it so the draw order is
// deterministic (mulberry32(1) keeps the pool order, so q1 shows first).
// Without this the walkthrough below fails ~50% of runs purely by draw luck.
beforeEach(() => vi.spyOn(Date, 'now').mockReturnValue(1));
afterEach(() => vi.restoreAllMocks());

function mount() {
  return render(
    <SessionProvider adapter={adapter as StorageAdapter}>
      <ContentProvider seed={bundle}>
        <QuizRunner moduleId="m1" />
      </ContentProvider>
    </SessionProvider>,
  );
}

describe('QuizRunner', () => {
  it('walks questions with instant feedback, then reports the score', async () => {
    mount();
    await screen.findByText('What is 2+2?');
    await userEvent.click(screen.getByRole('button', { name: '4' }));
    expect(await screen.findByText(/correct/i)).toBeTruthy();
    expect(screen.getByText(/2\+2=4/)).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: /next/i }));

    await screen.findByText('Pick TWO primes');
    await userEvent.click(screen.getByRole('checkbox', { name: '2' }));
    await userEvent.click(screen.getByRole('checkbox', { name: '3' }));
    await userEvent.click(screen.getByRole('button', { name: /check answer/i }));
    await userEvent.click(await screen.findByRole('button', { name: /next/i }));

    expect(await screen.findByText(/2 \/ 2/i)).toBeTruthy();
    await waitFor(() => expect(attempts).toHaveLength(1));
    expect(attempts[0]!.score).toBe(2);
    expect(attempts[0]!.attemptId).toBeTruthy();
  });
});
