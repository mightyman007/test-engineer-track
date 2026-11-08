import { describe, expect, it } from 'vitest';
import { isReady, trackCompletion } from './scoring.js';

describe('isReady', () => {
  it('requires minAttempts (default 2) and average >= readyPct', () => {
    expect(isReady([{ scorePct: 90 }, { scorePct: 85 }], 80)).toBe(true);
    expect(isReady([{ scorePct: 90 }], 80)).toBe(false);
    expect(isReady([{ scorePct: 90 }, { scorePct: 60 }], 80)).toBe(false);
  });

  it('counts a tie at exactly readyPct as ready — the documented rule', () => {
    // Regression pin, not RED→GREEN: isReady already implements mean >=
    // readyPct, so this passed the moment it was written. It exists because
    // the tie rule is a user-facing promise — the module-8 lesson teaches it
    // (78% + 82% → exactly 80% → ready) and the M3 plan's Review Focus 2
    // named it — and a future `>=`→`>` flip must fail loudly here instead of
    // silently breaking that promise.
    expect(isReady([{ scorePct: 80 }, { scorePct: 80 }], 80)).toBe(true);
    // The rule is the MEAN: a 75/85 split averages 80 and is also ready.
    expect(isReady([{ scorePct: 75 }, { scorePct: 85 }], 80)).toBe(true);
    // Contrast: strictly below the threshold stays not-ready.
    expect(isReady([{ scorePct: 79 }, { scorePct: 79 }], 80)).toBe(false);
  });
});

describe('trackCompletion', () => {
  it('fraction of completed modules', () => {
    expect(trackCompletion(['a', 'b', 'c', 'd'], new Set(['a', 'c']))).toBe(0.5);
    expect(trackCompletion([], new Set())).toBe(0);
  });
});
