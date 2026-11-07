import { expect } from 'vitest';
import type { MigratableData, QuizAttempt, ExamAttempt, CardReview, ProgressEntry } from './types.js';

export async function runParitySuite(buildAdapter: () => Promise<import('./types.js').StorageAdapter>): Promise<void> {
  const a = await buildAdapter();

  // fresh store → empty everything
  expect(await a.getSession()).toBeNull();
  expect(await a.getProgress()).toEqual({});
  expect(await a.getQuizAttempts()).toEqual([]);
  expect(await a.getExamAttempts()).toEqual([]);
  expect(await a.getReviewState()).toEqual({});

  // session
  const session = { mode: 'solo' as const, userId: 'local', displayName: 'You', role: 'learner' as const };
  await a.putSession(session);
  expect(await a.getSession()).toEqual(session);

  // progress roundtrip
  const entry: ProgressEntry = {
    track: 't1', module: 'm1', itemId: 'l1', status: 'done', updatedAt: '2026-11-07T00:00:00Z',
  };
  await a.putProgress([entry]);
  expect((await a.getProgress())['t1/m1/l1']).toEqual(entry);

  // quiz attempt + idempotency
  const qa: QuizAttempt = {
    attemptId: 'qa1', module: 'm1', score: 8, max: 10,
    perQuestion: { q1: true }, createdAt: '2026-11-07T01:00:00Z',
  };
  await a.recordQuizAttempt(qa);
  await a.recordQuizAttempt(qa); // same attemptId → still one row
  expect(await a.getQuizAttempts()).toHaveLength(1);
  expect((await a.getQuizAttempts('m1'))[0]!.score).toBe(8);
  expect(await a.getQuizAttempts('other')).toEqual([]);

  // exam attempt + idempotency
  const ea: ExamAttempt = {
    attemptId: 'ea1', examId: 'e1', score: 30, max: 40, passed: true, scorePct: 75,
    perTag: { ch1: { correct: 7, total: 8 } },
    responses: { q1: [0] }, createdAt: '2026-11-07T02:00:00Z', durationSec: 1800,
  };
  await a.recordExamAttempt(ea);
  await a.recordExamAttempt(ea);
  expect(await a.getExamAttempts()).toHaveLength(1);
  expect((await a.getExamAttempts('e1'))[0]!.passed).toBe(true);

  // review grading updates current state
  const state = { ease: 2.5, intervalDays: 1, dueAt: '2026-11-08T00:00:00Z', reps: 1, lapses: 0 };
  const review: CardReview = { cardId: 'c1', grade: 'good', state, createdAt: '2026-11-07T03:00:00Z' };
  await a.recordCardReview(review);
  await a.recordCardReview({ ...review, state: { ...state, intervalDays: 6 } });
  expect((await a.getReviewState())['c1']!.intervalDays).toBe(6); // latest wins

  // export/import roundtrip
  const data: MigratableData = await a.exportAll();
  expect(Object.keys(data.progress)).toHaveLength(1);
  expect(data.quizAttempts).toHaveLength(1);
  expect(data.examAttempts).toHaveLength(1);
  expect(Object.keys(data.cardStates)).toHaveLength(1);

  const b = await buildAdapter();
  await b.importAll(data);
  expect(await b.getProgress()).toEqual(await a.getProgress());
  expect(await b.getQuizAttempts()).toHaveLength(1);
  expect((await b.getReviewState())['c1']!.intervalDays).toBe(6);
}
