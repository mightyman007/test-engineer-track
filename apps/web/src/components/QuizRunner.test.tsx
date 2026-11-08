import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { QuizRunner } from './QuizRunner.js';
import { ContentProvider } from '../lib/content-context.js';
import { SessionProvider } from '../state/session.js';
import { drawQuizQuestions } from 'tet-core';
import type { ContentBundle, Question } from 'tet-core';
import type { QuizAttempt, StorageAdapter } from 'tet-storage';

// Spy the module's drawQuizQuestions (delegating to the real impl): the
// retake test pins the re-seed through the draw being recomputed with a NEW
// seed value. A raw "Date.now call count grows" assertion is vacuous here —
// jsdom reads Date.now for every dispatched event's timeStamp, so the count
// grows on ANY click.
vi.mock('tet-core', async (importOriginal) => {
  const real = await importOriginal<typeof import('tet-core')>();
  return { ...real, drawQuizQuestions: vi.fn(real.drawQuizQuestions) };
});

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
beforeEach(() => {
  vi.spyOn(Date, 'now').mockReturnValue(1);
  vi.mocked(drawQuizQuestions).mockClear();
});
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

  // 30-question bank where EVERY question's correct answer is option 'a'
  // (index 0): the walkthrough below is correct for ANY draw order, so the
  // retake assertion can target the re-seed itself (Date.now consulted
  // again) without comparing first stems — 1/30 coincidence flakiness avoided.
  const bigPool: Question[] = Array.from({ length: 30 }, (_, i) => ({
    id: `bq${String(i).padStart(2, '0')}`, type: 'single', stem: `bank-${i}`,
    options: ['a', 'b', 'c', 'd'], answers: [0], explanation: 'e', tags: ['ch1'], klevel: 'K1',
  }));
  const bigBundle: ContentBundle = {
    tracks: [{ id: 't1', title: 'T', description: 'D', order: 1,
      modules: [{ id: 'm1', track: 't1', title: 'M1', order: 1, source: 'x', quizPool: 'x', deck: 'x', lessonIds: [] }],
      readiness: { examIds: [], passPct: 65, readyPct: 80 } }],
    lessons: {}, questions: bigPool, flashcards: [], exams: [], diagrams: {},
    questionsByModule: { m1: bigPool.map((q) => q.id) }, cardsByModule: {},
  };

  it('retake re-seeds the draw (Date.now consulted again)', async () => {
    const draw = vi.mocked(drawQuizQuestions);
    const spy = vi.spyOn(Date, 'now');
    render(
      <SessionProvider adapter={adapter as StorageAdapter}>
        <ContentProvider seed={bigBundle}>
          <QuizRunner moduleId="m1" />
        </ContentProvider>
      </SessionProvider>,
    );
    // answer through the 12 drawn questions: pick 'a', Next ×12
    for (let i = 0; i < 12; i++) {
      await userEvent.click(await screen.findByRole('button', { name: 'a' }));
      await userEvent.click(await screen.findByRole('button', { name: /next/i }));
    }
    expect(await screen.findByText(/12 \/ 12/i)).toBeTruthy();
    const firstCall = draw.mock.calls.at(-1);
    expect(firstCall).toBeDefined();            // the first draw went through drawQuizQuestions
    const callsAfterFirstRun = draw.mock.calls.length;
    const seedBefore = firstCall![2]!;
    spy.mockReturnValue(2); // the retake's Date.now consult must yield a NEW value
    await userEvent.click(screen.getByRole('button', { name: /retake/i }));
    expect(draw.mock.calls.length).toBeGreaterThan(callsAfterFirstRun); // draw recomputed
    expect(draw.mock.calls.at(-1)![2]!).not.toBe(seedBefore);          // re-seed consumed Date.now again
    spy.mockRestore();
  });
});
