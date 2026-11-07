import { describe, expect, it } from 'vitest';
import { gradeAnswer, scoreAttempt } from './quiz.js';
import type { Question } from './types.js';

const single: Question = {
  id: 's1', type: 'single', stem: 's', options: ['a', 'b', 'c', 'd'],
  answers: [2], explanation: 'e', tags: ['ch1'],
};
const multi: Question = {
  id: 'm1', type: 'multi', stem: 'm', options: ['a', 'b', 'c', 'd', 'e'],
  answers: [0, 2], explanation: 'e', tags: ['ch1'],
};

describe('gradeAnswer', () => {
  it('single: exact index match', () => {
    expect(gradeAnswer(single, [2])).toBe(true);
    expect(gradeAnswer(single, [1])).toBe(false);
  });
  it('multi: all-or-nothing, order-insensitive', () => {
    expect(gradeAnswer(multi, [2, 0])).toBe(true);
    expect(gradeAnswer(multi, [0])).toBe(false);
    expect(gradeAnswer(multi, [0, 2, 4])).toBe(false);
  });
});

describe('scoreAttempt', () => {
  it('scores 1 point per correct question, records per-question results', () => {
    const r = scoreAttempt([single, multi], { s1: [2], m1: [0] });
    expect(r).toEqual({ score: 1, max: 2, perQuestion: { s1: true, m1: false } });
  });
  it('unanswered questions score false, not crash', () => {
    const r = scoreAttempt([single, multi], {});
    expect(r.score).toBe(0);
    expect(r.perQuestion).toEqual({ s1: false, m1: false });
  });
});
