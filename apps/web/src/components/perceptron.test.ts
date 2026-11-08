import { describe, expect, it } from 'vitest';
import {
  createDataset, errorCount, initialState, meanLoss, POINT_COUNT,
  sigmoid, trainStep,
} from './perceptron.js';

const state0 = initialState();

describe('perceptron demo dataset', () => {
  it('has 40 points split evenly into two classes', () => {
    expect(state0.points).toHaveLength(POINT_COUNT);
    expect(state0.points.filter((p) => p.label === 1)).toHaveLength(POINT_COUNT / 2);
    expect(state0.points.filter((p) => p.label === 0)).toHaveLength(POINT_COUNT / 2);
  });

  it('is deterministic for a fixed seed', () => {
    expect(createDataset()).toEqual(createDataset());
  });

  it('is linearly separable by construction — every class sits on its own side of x + y = 1', () => {
    for (const p of state0.points) {
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.x).toBeLessThanOrEqual(1);
      expect(p.y).toBeGreaterThanOrEqual(0);
      expect(p.y).toBeLessThanOrEqual(1);
      if (p.label === 1) expect(p.x + p.y).toBeGreaterThan(1.1);
      else expect(p.x + p.y).toBeLessThan(0.9);
    }
  });
});

describe('perceptron math', () => {
  it('sigmoid stays in (0, 1) even at extreme scores', () => {
    expect(sigmoid(0)).toBe(0.5);
    // Strictly inside (0, 1) up to the float64 saturation point (~z=37)…
    expect(sigmoid(30)).toBeGreaterThan(0);
    expect(sigmoid(30)).toBeLessThan(1);
    expect(sigmoid(-30)).toBeGreaterThan(0);
    expect(sigmoid(-30)).toBeLessThan(1);
    // …and finite (never NaN/Infinity) even where float64 rounds to 0 or 1.
    expect(Number.isFinite(sigmoid(1000))).toBe(true);
    expect(Number.isFinite(sigmoid(-1000))).toBe(true);
    expect(sigmoid(1000)).toBeGreaterThan(sigmoid(0));
    expect(sigmoid(-1000)).toBeLessThan(sigmoid(0));
  });

  it('starts with a substantial share of points misclassified (boundary near the middle)', () => {
    const errs = errorCount(state0);
    expect(errs).toBeGreaterThan(5);
    expect(errs).toBeLessThan(POINT_COUNT);
  });

  it('trainStep is pure — the state it receives is never mutated', () => {
    const before = JSON.stringify(state0);
    trainStep(state0);
    trainStep(state0);
    expect(JSON.stringify(state0)).toBe(before);
  });

  it('counts steps as it trains', () => {
    const once = trainStep(state0);
    expect(once.step).toBe(1);
    expect(trainStep(once).step).toBe(2);
  });

  it('DEMO PROPERTY: after 50 steps, loss and classification error are both below their starting values', () => {
    const loss0 = meanLoss(state0);
    const errs0 = errorCount(state0);
    let s = state0;
    for (let i = 0; i < 50; i++) s = trainStep(s);
    expect(meanLoss(s)).toBeLessThan(loss0);
    expect(errorCount(s)).toBeLessThan(errs0);
    expect(s.step).toBe(50);
  });

  it('separable dataset trains to zero misclassifications', () => {
    let s = state0;
    for (let i = 0; i < 300; i++) s = trainStep(s);
    expect(errorCount(s)).toBe(0);
    expect(meanLoss(s)).toBeLessThan(0.05);
  });
});
