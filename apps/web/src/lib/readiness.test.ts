import { describe, expect, it } from 'vitest';
import { TAKE_TWO_MOCKS } from './readiness.js';

// M5 Task 1: one shared sentence for the "go take your two mocks" ask, used
// verbatim by ExamReadinessSection (TrackPage renders it), the Dashboard
// readiness chip, and asserted by their tests. This pins the exact string so
// a stray rewording on one surface fails here first.
describe('TAKE_TWO_MOCKS', () => {
  it('is the single-sourced ask-for-two-mocks copy', () => {
    expect(TAKE_TWO_MOCKS).toBe('Take 2 mock exams to get a readiness reading');
  });
});
