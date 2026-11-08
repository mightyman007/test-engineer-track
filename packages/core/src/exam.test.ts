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

// ---------------------------------------------------------------------------
// Schema v2: per-(chapter × K-level) cells.
//
// The RECONCILED per-chapter K draws (istqb-mock-1.toml header; ch3's
// M2-pinned 1/3 split was corrected to 2/2 in M3 — see that header's
// correction sources):
//   ch1 K1=2/K2=6, ch2 K1=2/K2=4, ch3 K1=2/K2=2, ch4 K1=0/K2=6/K3=5,
//   ch5 K1=1/K2=5/K3=3, ch6 K1=1/K2=1 — 40 questions total, K1 8/K2 24/K3 8.
// The synthetic bank below mirrors the REAL bank's per-(chapter × K) supplies
// (including its multi-select distribution, multis drawn from the K counts):
//   ch1 13 K1/23 K2; ch2 9/24; ch3 13/20; ch4 12/9/17; ch5 9/17/7; ch6 8/11
//   = 192 questions, no klevel-less questions (ch6's 192nd is the M3-added
//   istqb-q-0192, a second ch6 K2 multi).
// (ch1 was 14/22 until the M4 consistency pass re-tagged istqb-q-0012 K1→K2.)
// ---------------------------------------------------------------------------

type Level = 'K1' | 'K2' | 'K3';

/** Per-chapter K supplies + multi-select distribution of the real 192-question bank. */
const REAL_BANK_SHAPE: Record<string, Record<Level, number> & { multi: Partial<Record<Level, number>> }> = {
  ch1: { K1: 13, K2: 23, K3: 0, multi: { K2: 2 } },
  ch2: { K1: 9, K2: 24, K3: 0, multi: { K1: 1, K2: 1 } },
  ch3: { K1: 13, K2: 20, K3: 0, multi: { K1: 1, K2: 1 } },
  ch4: { K1: 12, K2: 9, K3: 17, multi: { K2: 2 } },
  ch5: { K1: 9, K2: 17, K3: 7, multi: { K2: 1, K3: 1 } },
  ch6: { K1: 8, K2: 11, K3: 0, multi: { K2: 2 } },
};

/** Reconciled per-(chapter × K) draws for mock 1 (M3 correction: ch3 2/2). */
const PINNED_DRAWS: Record<string, Record<Level, number>> = {
  ch1: { K1: 2, K2: 6, K3: 0 },
  ch2: { K1: 2, K2: 4, K3: 0 },
  ch3: { K1: 2, K2: 2, K3: 0 },
  ch4: { K1: 0, K2: 6, K3: 5 },
  ch5: { K1: 1, K2: 5, K3: 3 },
  ch6: { K1: 1, K2: 1, K3: 0 },
};

function realShapedBank(): Question[] {
  const out: Question[] = [];
  let n = 0;
  for (const [tag, spec] of Object.entries(REAL_BANK_SHAPE)) {
    for (const k of ['K1', 'K2', 'K3'] as const) {
      const multis = spec.multi[k] ?? 0;
      for (let i = 0; i < spec[k] - multis; i++) {
        out.push({
          id: `q${n++}`, type: 'single', stem: `${tag}-${k}-${i}`,
          options: ['a', 'b', 'c', 'd'], answers: [0], explanation: 'e',
          tags: [tag], klevel: k,
        });
      }
      for (let i = 0; i < multis; i++) {
        out.push({
          id: `q${n++}`, type: 'multi', stem: `${tag}-${k}-multi-${i}`,
          options: ['a', 'b', 'c', 'd', 'e'], answers: [0, 1], explanation: 'e',
          tags: [tag], klevel: k,
        });
      }
    }
  }
  return out;
}

const MOCK1_CELLS: ExamDefinition = {
  id: 'istqb-mock-1', track: 'istqb', title: 'Mock 1 (v2 cells)',
  timeLimitMin: 60, passPct: 65, total: 40, multiSelectMax: 2,
  blueprintExact: true,
  groups: Object.entries(PINNED_DRAWS).map(([tag, cells]) => ({
    tag,
    count: cells.K1 + cells.K2 + cells.K3,
    klevels: { ...cells },
  })),
};

describe('assembleExam per-group K cells (schema v2)', () => {
  it('fills every per-(chapter × K) cell exactly across 50 seeds (reconciled cells, 192-shaped bank)', () => {
    const bank = realShapedBank();
    expect(bank).toHaveLength(192);
    for (let seed = 1; seed <= 50; seed++) {
      const exam = assembleExam(MOCK1_CELLS, bank, seed);
      expect(exam.questions).toHaveLength(40);
      expect(new Set(exam.questions.map((q) => q.id)).size).toBe(40);
      let multi = 0;
      for (const g of MOCK1_CELLS.groups) {
        const drawn = exam.questions.filter((q) => q.tags.includes(g.tag));
        expect(drawn).toHaveLength(g.count);
        for (const level of ['K1', 'K2', 'K3'] as const) {
          const got = drawn.filter((q) => q.klevel === level).length;
          expect(got, `seed ${seed} group ${g.tag} ${level}`).toBe(PINNED_DRAWS[g.tag]![level]);
        }
      }
      for (const q of exam.questions) if (q.type === 'multi') multi++;
      expect(multi).toBeLessThanOrEqual(MOCK1_CELLS.multiSelectMax);
      // aggregate K follows from the cells (8/24/8 — the reconciled draws' sum)
      const byK: Record<string, number> = {};
      for (const q of exam.questions) if (q.klevel) byK[q.klevel] = (byK[q.klevel] ?? 0) + 1;
      expect(byK).toEqual({ K1: 8, K2: 24, K3: 8 });
    }
  });

  it('is deterministic for a given seed (v2 cells)', () => {
    const bank = realShapedBank();
    const a = assembleExam(MOCK1_CELLS, bank, 7);
    const b = assembleExam(MOCK1_CELLS, bank, 7);
    expect(a.questions.map((q) => q.id)).toEqual(b.questions.map((q) => q.id));
  });

  it('throws AssemblyError naming the starved cell when a chapter lacks the K supply', () => {
    // Remove every ch4 K3 question: ch4's K3 cell (5) can never fill.
    const bank = realShapedBank().filter((q) => !(q.tags[0] === 'ch4' && q.klevel === 'K3'));
    expect(bank).toHaveLength(175);
    expect(() => assembleExam(MOCK1_CELLS, bank, 1)).toThrow(AssemblyError);
    expect(() => assembleExam(MOCK1_CELLS, bank, 1)).toThrow(/group ch4 could not draw 5 K3/);
  });

  it('names the remaining shortfall when a cell is partially short', () => {
    // Keep only 3 of ch4's 17 K3 questions: the cell needs 5, shortfall is 2.
    const bank = realShapedBank();
    let kept = 0;
    const thin = bank.filter((q) => {
      if (q.tags[0] === 'ch4' && q.klevel === 'K3') { kept++; return kept <= 3; }
      return true;
    });
    expect(() => assembleExam(MOCK1_CELLS, thin, 1)).toThrow(/group ch4 could not draw 2 K3/);
  });

  it('fills free slots with klevel-less questions when cells do not cover the count', () => {
    // Casual definition (no blueprintExact): count 3, cells only 1 K1 + 1 K2
    // → the third slot must come from a klevel-less question, cells still zeroed.
    const def: ExamDefinition = {
      id: 'casual', track: 't', title: 'Casual', timeLimitMin: 30, passPct: 50,
      total: 3, multiSelectMax: 1,
      groups: [{ tag: 'ch1', count: 3, klevels: { K1: 1, K2: 1, K3: 0 } }],
    };
    const bank: Question[] = [
      { id: 'k1a', type: 'single', stem: 's', options: ['a', 'b', 'c', 'd'], answers: [0], explanation: 'e', tags: ['ch1'], klevel: 'K1' },
      { id: 'k1b', type: 'single', stem: 's', options: ['a', 'b', 'c', 'd'], answers: [0], explanation: 'e', tags: ['ch1'], klevel: 'K1' },
      { id: 'k2a', type: 'single', stem: 's', options: ['a', 'b', 'c', 'd'], answers: [0], explanation: 'e', tags: ['ch1'], klevel: 'K2' },
      { id: 'nok', type: 'single', stem: 's', options: ['a', 'b', 'c', 'd'], answers: [0], explanation: 'e', tags: ['ch1'] },
    ];
    for (let seed = 1; seed <= 20; seed++) {
      const exam = assembleExam(def, bank, seed);
      expect(exam.questions).toHaveLength(3);
      expect(exam.questions.some((q) => q.id === 'nok')).toBe(true);
      expect(exam.questions.filter((q) => q.klevel === 'K1')).toHaveLength(1);
      expect(exam.questions.filter((q) => q.klevel === 'K2')).toHaveLength(1);
    }
  });

  it('refuses klevel-less filler when blueprintExact cells must reach zero', () => {
    // Cells cover all 3 slots, but the bank has no K3 question: a klevel-less
    // question must NOT silently fill the K3 cell's slot — the cell starves.
    const def: ExamDefinition = {
      id: 'strict', track: 't', title: 'Strict', timeLimitMin: 30, passPct: 50,
      total: 3, multiSelectMax: 0,
      groups: [{ tag: 'ch1', count: 3, klevels: { K1: 1, K2: 1, K3: 1 } }],
    };
    const bank: Question[] = [
      { id: 'k1a', type: 'single', stem: 's', options: ['a', 'b', 'c', 'd'], answers: [0], explanation: 'e', tags: ['ch1'], klevel: 'K1' },
      { id: 'k2a', type: 'single', stem: 's', options: ['a', 'b', 'c', 'd'], answers: [0], explanation: 'e', tags: ['ch1'], klevel: 'K2' },
      { id: 'nok1', type: 'single', stem: 's', options: ['a', 'b', 'c', 'd'], answers: [0], explanation: 'e', tags: ['ch1'] },
      { id: 'nok2', type: 'single', stem: 's', options: ['a', 'b', 'c', 'd'], answers: [0], explanation: 'e', tags: ['ch1'] },
    ];
    expect(() => assembleExam(def, bank, 1)).toThrow(/group ch1 could not draw 1 K3/);
  });

  it('skips klevel\'d questions whose level has no cell in the group (runtime-partial cells)', () => {
    // Cells record without K2/K3 keys (as zod may produce from partial TOML):
    // an absent cell means no quota — the K2 question must be skipped.
    const def: ExamDefinition = {
      id: 'partial', track: 't', title: 'Partial cells', timeLimitMin: 30, passPct: 50,
      total: 2, multiSelectMax: 0,
      groups: [{ tag: 'ch1', count: 2, klevels: { K1: 2 } as Record<Level, number> }],
    };
    const bank: Question[] = [
      { id: 'k1a', type: 'single', stem: 's', options: ['a', 'b', 'c', 'd'], answers: [0], explanation: 'e', tags: ['ch1'], klevel: 'K1' },
      { id: 'k1b', type: 'single', stem: 's', options: ['a', 'b', 'c', 'd'], answers: [0], explanation: 'e', tags: ['ch1'], klevel: 'K1' },
      { id: 'k2a', type: 'single', stem: 's', options: ['a', 'b', 'c', 'd'], answers: [0], explanation: 'e', tags: ['ch1'], klevel: 'K2' },
    ];
    const exam = assembleExam(def, bank, 1);
    expect(exam.questions.map((q) => q.id).sort()).toEqual(['k1a', 'k1b']);
  });

  it('rejects definitions mixing groups with and without klevels cells', () => {
    const mixed: ExamDefinition = {
      id: 'mixed', track: 't', title: 'Mixed', timeLimitMin: 30, passPct: 50,
      total: 2, multiSelectMax: 0,
      groups: [
        { tag: 'ch1', count: 1, klevels: { K1: 1, K2: 0, K3: 0 } },
        { tag: 'ch2', count: 1 },
      ],
    };
    const bank: Question[] = [
      { id: 'a1', type: 'single', stem: 's', options: ['a', 'b', 'c', 'd'], answers: [0], explanation: 'e', tags: ['ch1'], klevel: 'K1' },
      { id: 'a2', type: 'single', stem: 's', options: ['a', 'b', 'c', 'd'], answers: [0], explanation: 'e', tags: ['ch2'], klevel: 'K1' },
    ];
    expect(() => assembleExam(mixed, bank, 1)).toThrow(/all groups or none/);
  });
});
