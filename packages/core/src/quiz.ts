import { mulberry32 } from './exam.js';
import type { Question } from './types.js';

export function gradeAnswer(q: Question, selected: number[]): boolean {
  const want = [...q.answers].sort((a, b) => a - b);
  const got = [...selected].sort((a, b) => a - b);
  return want.length === got.length && want.every((v, i) => v === got[i]);
}

export function scoreAttempt(
  questions: Question[],
  responses: Record<string, number[]>,
): { score: number; max: number; perQuestion: Record<string, boolean> } {
  let score = 0;
  const perQuestion: Record<string, boolean> = {};
  for (const q of questions) {
    const ok = gradeAnswer(q, responses[q.id] ?? []);
    perQuestion[q.id] = ok;
    if (ok) score += 1;
  }
  return { score, max: questions.length, perQuestion };
}

/** Deterministic per seed: draws `size` distinct questions from the pool
 *  (Fisher–Yates over a seeded shuffle, then slice). Used by the quiz runner
 *  so retakes can re-seed without DOM access. Non-positive sizes draw the
 *  empty quiz — slice(0, n) with negative n slices from the END, which would
 *  otherwise return a quiz the caller never asked for. */
export function drawQuizQuestions(pool: Question[], size: number, seed: number): Question[] {
  if (size <= 0) return [];
  const rng = mulberry32(seed >>> 0);
  const arr = [...pool];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
  return arr.slice(0, size);
}
