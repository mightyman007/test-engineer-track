import { describe, expect, it } from 'vitest';
import { newCardState, reviewCard, type Grade } from './srs.js';

const NOW = new Date('2026-11-07T12:00:00Z');
const day = 86_400_000;

describe('SM-2', () => {
  it('new card state has Anki defaults', () => {
    const s = newCardState();
    expect(s).toMatchObject({ ease: 2.5, intervalDays: 0, reps: 0, lapses: 0 });
  });

  it('good on a new card schedules 1 day', () => {
    const s = reviewCard(newCardState(), 'good', NOW);
    expect(s.intervalDays).toBe(1);
    expect(s.dueAt).toBe(new Date(NOW.getTime() + day).toISOString());
    expect(s.reps).toBe(1);
  });

  it('good,good,good walks 1 → 6 → 15 at ease 2.5', () => {
    const a = reviewCard(newCardState(), 'good', NOW);
    const b = reviewCard(a, 'good', NOW);
    const c = reviewCard(b, 'good', NOW);
    expect(b.intervalDays).toBe(6);
    expect(c.intervalDays).toBe(15); // round(6 * 2.5)
  });

  it('easy on a new card schedules 4 days and raises ease', () => {
    const s = reviewCard(newCardState(), 'easy', NOW);
    expect(s.intervalDays).toBe(4);
    expect(s.ease).toBeCloseTo(2.65);
  });

  it('again lapses: resets reps, cuts ease, due in 10 minutes', () => {
    const grown = reviewCard(reviewCard(newCardState(), 'good', NOW), 'good', NOW);
    const lapsed = reviewCard(grown, 'again', NOW);
    expect(lapsed.reps).toBe(0);
    expect(lapsed.lapses).toBe(1);
    expect(lapsed.ease).toBeCloseTo(2.3);
    expect(lapsed.intervalDays).toBe(0);
    expect(new Date(lapsed.dueAt).getTime() - NOW.getTime()).toBe(10 * 60_000);
  });

  it('hard multiplies by 1.2 and lowers ease, floored at 1.3', () => {
    const grown = reviewCard(reviewCard(reviewCard(newCardState(), 'good', NOW), 'good', NOW), 'good', NOW);
    const h = reviewCard(grown, 'hard', NOW);
    expect(h.ease).toBeCloseTo(2.35);
    expect(h.intervalDays).toBe(18); // round(15 * 1.2)
    let s = grown;
    for (let i = 0; i < 20; i++) s = reviewCard(s, 'again', NOW);
    expect(s.ease).toBe(1.3); // floor holds
  });

  it('easy grows faster than good from a mature interval', () => {
    const base = reviewCard(reviewCard(reviewCard(newCardState(), 'good', NOW), 'good', NOW), 'good', NOW); // 15d, ease 2.5
    const g = reviewCard(base, 'good', NOW);  // round(15*2.5) = 38
    const e = reviewCard(base, 'easy', NOW);  // round(15*2.65*1.3) = 52
    expect(g.intervalDays).toBe(38);
    expect(e.intervalDays).toBe(52);
  });
});
