import { describe, expect, it } from 'vitest';
import { assembleExam, mulberry32, AssemblyError } from './exam.js';
import type { ExamDefinition, Question } from './types.js';

function bank(counts: Record<string, { K1: number; K2: number; K3: number; multi: number }>): Question[] {
  const out: Question[] = [];
  let n = 0;
  for (const [tag, c] of Object.entries(counts)) {
    for (const k of ['K1', 'K2', 'K3'] as const) {
      for (let i = 0; i < c[k]; i++) {
        out.push({
          id: `q${n++}`, type: 'single', stem: tag + k, options: ['a', 'b', 'c', 'd'],
          answers: [0], explanation: 'e', tags: [tag], klevel: k,
        });
      }
    }
    for (let i = 0; i < c.multi; i++) {
      out.push({
        id: `q${n++}`, type: 'multi', stem: tag + 'multi', options: ['a', 'b', 'c', 'd', 'e'],
        answers: [0, 1], explanation: 'e', tags: [tag], klevel: 'K2',
      });
    }
  }
  return out;
}

const BLUEPRINT: ExamDefinition = {
  id: 'mock1', track: 'istqb', title: 'Mock 1', timeLimitMin: 60, passPct: 65,
  total: 40, multiSelectMax: 2,
  groups: [
    { tag: 'ch1', count: 8 }, { tag: 'ch2', count: 6 }, { tag: 'ch3', count: 4 },
    { tag: 'ch4', count: 11 }, { tag: 'ch5', count: 9 }, { tag: 'ch6', count: 2 },
  ],
  klevels: { K1: 8, K2: 24, K3: 8 },
};

const RICH_BANK = bank({
  ch1: { K1: 4, K2: 10, K3: 2, multi: 2 },
  ch2: { K1: 3, K2: 8, K3: 1, multi: 1 },
  ch3: { K1: 2, K2: 6, K3: 2, multi: 1 },
  ch4: { K1: 5, K2: 12, K3: 14, multi: 3 },
  ch5: { K1: 4, K2: 10, K3: 8, multi: 2 },
  ch6: { K1: 1, K2: 3, K3: 0, multi: 0 },
});

describe('assembleExam', () => {
  it('produces an exam matching the blueprint exactly', () => {
    const exam = assembleExam(BLUEPRINT, RICH_BANK, 1);
    expect(exam.questions).toHaveLength(40);
    const byTag: Record<string, number> = {};
    const byK: Record<string, number> = {};
    let multi = 0;
    for (const q of exam.questions) {
      for (const t of q.tags) byTag[t] = (byTag[t] ?? 0) + 1;
      if (q.klevel) byK[q.klevel] = (byK[q.klevel] ?? 0) + 1;
      if (q.type === 'multi') multi++;
    }
    expect(byTag).toEqual({ ch1: 8, ch2: 6, ch3: 4, ch4: 11, ch5: 9, ch6: 2 });
    expect(byK).toEqual({ K1: 8, K2: 24, K3: 8 });
    expect(multi).toBeLessThanOrEqual(2);
    // no duplicate questions
    expect(new Set(exam.questions.map((q) => q.id)).size).toBe(40);
  });

  it('is deterministic for a given seed', () => {
    const a = assembleExam(BLUEPRINT, RICH_BANK, 7);
    const b = assembleExam(BLUEPRINT, RICH_BANK, 7);
    expect(a.questions.map((q) => q.id)).toEqual(b.questions.map((q) => q.id));
  });

  it('different seeds yield different orderings (usually)', () => {
    const a = assembleExam(BLUEPRINT, RICH_BANK, 1);
    const b = assembleExam(BLUEPRINT, RICH_BANK, 2);
    expect(a.questions.map((q) => q.id)).not.toEqual(b.questions.map((q) => q.id));
  });

  it('throws AssemblyError when K-level quotas cannot be met', () => {
    // Remove all K3 questions from ch4 and ch5: remaining K3 capacity
    // (ch1:2, ch2:1, ch3:2 = 5) is below the K3 quota of 8, and no seed can fix that.
    const thin = RICH_BANK.filter(
      (q) => !(q.klevel === 'K3' && (q.tags[0] === 'ch4' || q.tags[0] === 'ch5')),
    );
    expect(() => assembleExam(BLUEPRINT, thin, 1)).toThrow(AssemblyError);
  });

  it('throws AssemblyError when a group bank is smaller than its count', () => {
    const tiny = RICH_BANK.filter((q) => q.tags[0] !== 'ch1');
    expect(() => assembleExam(BLUEPRINT, tiny, 1)).toThrow(AssemblyError);
  });

  it('never returns an exam exceeding the multi-select cap (across many seeds)', () => {
    for (let s = 1; s <= 50; s++) {
      const exam = assembleExam(BLUEPRINT, RICH_BANK, s);
      const multi = exam.questions.filter((q) => q.type === 'multi').length;
      expect(multi).toBeLessThanOrEqual(BLUEPRINT.multiSelectMax);
    }
  });

  it('mulberry32 is deterministic', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    const seqA = [a(), a(), a()];
    const seqB = [b(), b(), b()];
    expect(seqA).toEqual(seqB);
    expect(seqA[0]).toBeGreaterThan(0);
    expect(seqA[0]).toBeLessThan(1);
  });
});
