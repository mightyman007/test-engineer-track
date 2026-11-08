/**
 * Pure logic for the module-A3 perceptron demo — no React, no canvas, no ML
 * libraries: every formula below is hand-rolled so it can run headless in
 * unit tests. The demo trains a single perceptron (2 weights + bias) by
 * gradient descent on a fixed, linearly separable toy dataset.
 *
 * The math, in one place. A point (x, y) with label t ∈ {0, 1} gets
 *   z = w1·x + w2·y + b          (raw score; the boundary is the line z = 0)
 *   p = sigmoid(z)               (predicted probability of class 1)
 *   loss = (p − t)²              (per point; the demo reports the mean)
 * and gradient descent nudges each weight downhill:
 *   ∂loss/∂z = 2·(p − t)·p·(1 − p)     (chain rule, applied to the sigmoid)
 *   ∂z/∂w1 = x,  ∂z/∂w2 = y,  ∂z/∂b = 1
 *   w ← w − LEARNING_RATE · mean(∂loss/∂w)
 */

export interface DemoPoint {
  x: number;
  y: number;
  label: 0 | 1;
}

/** One drawable snapshot: the weights being trained, the dataset, and the step count. */
export interface PerceptronState {
  w1: number;
  w2: number;
  b: number;
  points: DemoPoint[];
  step: number;
}

/** Dataset size (~40 points per the demo contract; even split keeps both classes visible). */
export const POINT_COUNT = 40;
export const INITIAL_W1 = 0.1;
export const INITIAL_W2 = -0.1;
export const INITIAL_B = 0;
/** Small enough to descend smoothly, large enough to visibly move within ~1 s of steps. */
export const LEARNING_RATE = 2;
/** Seed for the fixed toy dataset — same points in every browser and every test run. */
export const DEMO_SEED = 20261107;

/**
 * Deterministic PRNG (mulberry32). The dataset must be byte-identical
 * everywhere — tests assert on it, and the lesson text quotes its behavior.
 */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Standard-normal sample via Box–Muller from two uniforms in (0, 1]. */
function gaussian(rand: () => number): number {
  const u1 = Math.max(rand(), 1e-12);
  const u2 = rand();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

/**
 * The fixed toy dataset: two gaussian clusters placed on opposite sides of the
 * line x + y = 1 with a wide margin, so the classes are linearly separable by
 * construction (rejection sampling enforces the margin; the fixed seed makes
 * the accepted set deterministic).
 */
export function createDataset(seed: number = DEMO_SEED): DemoPoint[] {
  const rand = mulberry32(seed);
  const clusters: Array<{ cx: number; cy: number; label: 0 | 1; high: boolean }> = [
    { cx: 0.66, cy: 0.72, label: 1, high: true },
    { cx: 0.34, cy: 0.3, label: 0, high: false },
  ];
  const points: DemoPoint[] = [];
  for (const c of clusters) {
    while (points.filter((p) => p.label === c.label).length < POINT_COUNT / 2) {
      const x = c.cx + gaussian(rand) * 0.09;
      const y = c.cy + gaussian(rand) * 0.09;
      // Keep every point inside the unit square AND well clear of the margin line.
      const inBox = x >= 0.03 && x <= 0.97 && y >= 0.03 && y <= 0.97;
      const onOwnSide = c.high ? x + y > 1.15 : x + y < 0.85;
      if (inBox && onOwnSide) points.push({ x, y, label: c.label });
    }
  }
  return points;
}

/** The demo's starting state: near-zero weights, the fixed dataset, step 0. */
export function initialState(): PerceptronState {
  return { w1: INITIAL_W1, w2: INITIAL_W2, b: INITIAL_B, points: createDataset(), step: 0 };
}

/** Stable sigmoid — the two-branch form never overflows for large |z|. */
export function sigmoid(z: number): number {
  if (z >= 0) return 1 / (1 + Math.exp(-z));
  const e = Math.exp(z);
  return e / (1 + e);
}

/** Raw perceptron score for a point; the decision boundary is score = 0. */
export function score(s: PerceptronState, x: number, y: number): number {
  return s.w1 * x + s.w2 * y + s.b;
}

/** Mean squared error between sigmoid(score) and each 0/1 label. */
export function meanLoss(s: PerceptronState): number {
  let total = 0;
  for (const p of s.points) {
    const diff = sigmoid(score(s, p.x, p.y)) - p.label;
    total += diff * diff;
  }
  return total / s.points.length;
}

/** Points sitting on the wrong side of the boundary — the demo's error readout. */
export function errorCount(s: PerceptronState): number {
  let wrong = 0;
  for (const p of s.points) {
    const predicted: 0 | 1 = score(s, p.x, p.y) > 0 ? 1 : 0;
    if (predicted !== p.label) wrong += 1;
  }
  return wrong;
}

/**
 * One gradient-descent step. Pure: returns a NEW state (the input is never
 * mutated; `points` is shared by reference and treated as immutable), so the
 * demo can hold a history of states and tests can assert on purity.
 */
export function trainStep(s: PerceptronState): PerceptronState {
  let gw1 = 0;
  let gw2 = 0;
  let gb = 0;
  for (const p of s.points) {
    const z = score(s, p.x, p.y);
    const pr = sigmoid(z);
    // ∂loss/∂z for squared error through a sigmoid: 2·(p − t)·p·(1 − p).
    const dz = 2 * (pr - p.label) * pr * (1 - pr);
    gw1 += dz * p.x;
    gw2 += dz * p.y;
    gb += dz;
  }
  const n = s.points.length;
  return {
    ...s,
    w1: s.w1 - LEARNING_RATE * (gw1 / n),
    w2: s.w2 - LEARNING_RATE * (gw2 / n),
    b: s.b - LEARNING_RATE * (gb / n),
    step: s.step + 1,
  };
}
