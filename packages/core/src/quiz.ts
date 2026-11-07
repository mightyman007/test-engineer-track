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
