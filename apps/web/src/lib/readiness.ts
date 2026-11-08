import { isReady } from 'tet-core';
import type { ExamAttempt } from 'tet-storage';

/** The attempt fields readiness math needs (real attempts satisfy it structurally). */
export type ReadinessAttempt = Pick<ExamAttempt, 'examId' | 'scorePct' | 'createdAt'>;

export type ReadinessState = 'no-exams' | 'no-attempts' | 'not-ready' | 'ready';

export interface ReadinessVerdict<T extends ReadinessAttempt = ReadinessAttempt> {
  state: ReadinessState;
  /** Mean of the last 2 track attempts, rounded — undefined until 2 exist. */
  lastTwoAvgPct?: number;
  /** The track's exam attempts, oldest → newest (isReady consumes the tail). */
  trackAttempts: T[];
}

/**
 * Readiness verdict for a track (spec §5): the mean of the learner's LAST 2
 * attempts on the track's readiness exams must be ≥ readyPct. Attempts are
 * filtered to the track's examIds (other exams' attempts never leak in) and
 * sorted oldest → newest regardless of the adapter's return order, because
 * `isReady` consumes the array's tail as "the last 2".
 */
export function readinessVerdict<T extends ReadinessAttempt>(
  examIds: readonly string[],
  readyPct: number,
  attempts: readonly T[],
): ReadinessVerdict<T> {
  const ids = new Set(examIds);
  const trackAttempts = attempts
    .filter((a) => ids.has(a.examId))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  if (examIds.length === 0) return { state: 'no-exams', trackAttempts };
  if (trackAttempts.length < 2) return { state: 'no-attempts', trackAttempts };
  const last2 = trackAttempts.slice(-2);
  const lastTwoAvgPct = Math.round(last2.reduce((n, a) => n + a.scorePct, 0) / last2.length);
  return {
    state: isReady(trackAttempts, readyPct) ? 'ready' : 'not-ready',
    lastTwoAvgPct,
    trackAttempts,
  };
}
