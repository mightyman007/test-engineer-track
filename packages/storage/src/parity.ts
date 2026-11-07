import { expect } from 'vitest';
import type { MigratableData, QuizAttempt, ExamAttempt, CardReview, ProgressEntry, StorageAdapter } from './types.js';

/**
 * Runs the full parity suite against an adapter built by `buildAdapter`.
 *
 * `buildAdapter` is called twice: `'primary'` backs the whole suite, and
 * `'secondary'` is only used as the import target for the export/import
 * roundtrip. What the roundtrip then proves is adapter-specific:
 * - A zero-arg factory (e.g. LocalAdapter's `() => Promise.resolve(createLocalAdapter())`)
 *   yields two connections to the SAME browser database, so the import
 *   assertions verify merge-into-existing-store behavior.
 * - A phase-aware factory (e.g. ServerAdapter's) can hand back a fresh
 *   adapter bound to a different user on a fresh server for `'secondary'`,
 *   so the import assertions prove real cross-store data movement.
 */
export async function runParitySuite(
  buildAdapter: (which: 'primary' | 'secondary') => Promise<StorageAdapter>,
): Promise<void> {
  const a = await buildAdapter('primary');

  // fresh store → empty data surfaces. (Session is handled below: its "fresh"
  // meaning is mode-specific — solo adapters start signed out, cohort adapters
  // derive their session from the server cookie.)
  expect(await a.getProgress()).toEqual({});
  expect(await a.getQuizAttempts()).toEqual([]);
  expect(await a.getExamAttempts()).toEqual([]);
  expect(await a.getReviewState()).toEqual({});

  // session — the contract differs by mode: solo adapters own session state
  // (exact put/get roundtrip, null when fresh); cohort adapters keep session
  // state in server cookies, so putSession is a no-op there and getSession
  // reflects the server-authenticated user instead. Assert whichever contract
  // this adapter speaks.
  const initial = await a.getSession();
  if (initial !== null) expect(initial.mode).toBe('cohort'); // a fresh solo adapter must be signed out
  const session = { mode: 'solo' as const, userId: 'local', displayName: 'You', role: 'learner' as const };
  await a.putSession(session);
  const after = await a.getSession();
  if (after?.mode === 'solo') {
    expect(after).toEqual(session); // solo: exact roundtrip
  } else {
    expect(after).toEqual(initial); // cohort: putSession must not disturb the server-derived session
  }

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

  const b = await buildAdapter('secondary');
  await b.importAll(data);
  expect(await b.getProgress()).toEqual(await a.getProgress());
  expect(await b.getQuizAttempts()).toHaveLength(1);
  expect((await b.getReviewState())['c1']!.intervalDays).toBe(6);

  // exam drafts (autosave)
  const draft = { examId: 'e1', responses: { q1: [0] }, flags: ['q2'], startedAt: '2026-11-07T00:00:00Z', remainingSec: 1800 };
  await a.putExamDraft(draft);
  expect(await a.getExamDraft('e1')).toEqual(draft);
  expect(await a.getExamDraft('e2')).toBeNull();
  await a.putExamDraft({ ...draft, responses: { q1: [1] } });
  expect((await a.getExamDraft('e1'))!.responses).toEqual({ q1: [1] });
  await a.clearExamDraft('e1');
  expect(await a.getExamDraft('e1')).toBeNull();
}
