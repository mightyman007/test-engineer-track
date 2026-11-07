import { describe, expect, it } from 'vitest';
import { isReady, trackCompletion } from './scoring.js';

describe('isReady', () => {
  it('requires minAttempts (default 2) and average >= readyPct', () => {
    expect(isReady([{ scorePct: 90 }, { scorePct: 85 }], 80)).toBe(true);
    expect(isReady([{ scorePct: 90 }], 80)).toBe(false);
    expect(isReady([{ scorePct: 90 }, { scorePct: 60 }], 80)).toBe(false);
  });
});

describe('trackCompletion', () => {
  it('fraction of completed modules', () => {
    expect(trackCompletion(['a', 'b', 'c', 'd'], new Set(['a', 'c']))).toBe(0.5);
    expect(trackCompletion([], new Set())).toBe(0);
  });
});
