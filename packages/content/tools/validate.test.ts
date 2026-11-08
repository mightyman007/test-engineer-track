import { describe, expect, it } from 'vitest';
import { validateContent } from './validate.js';
import { collectContent, readBankFloors, CONTENT_ROOT } from './build.js';
import type { ExamDefinition, Flashcard, LessonMeta, Question, Track } from 'tet-core';

function baseTrack(): Track {
  return {
    id: 't1', title: 'T', description: 'D', order: 1,
    modules: [{
      id: 'm1', track: 't1', title: 'M1', order: 1,
      source: 'istqb/module-1', quizPool: 'istqb/module-1', deck: 'istqb/module-1',
      lessonIds: ['l1'], examWeight: 8,
    }],
    readiness: { examIds: ['e1'], passPct: 65, readyPct: 80 },
  };
}
function baseLesson(): LessonMeta {
  return {
    id: 'l1', module: 'm1', title: 'L1', minutes: 10, objectives: [],
    videos: [{ title: 'v', url: 'https://www.youtube.com/watch?v=abc' }],
    diagrams: [{ title: 'd', file: 'diagrams/x.svg' }], body: 'body',
  };
}
function baseQuestion(): Question {
  return {
    id: 'q1', type: 'single', stem: 's', options: ['a', 'b', 'c', 'd'],
    answers: [0], explanation: 'e', tags: ['ch1'], klevel: 'K1',
  };
}
function baseCard(): Flashcard {
  return { id: 'c1', front: 'f', back: 'b', tags: ['ch1'] };
}
function baseExam(): ExamDefinition {
  return {
    id: 'e1', track: 't1', title: 'E', timeLimitMin: 60, passPct: 65,
    total: 1, multiSelectMax: 0, groups: [{ tag: 'ch1', count: 1 }],
  };
}

const diagrams = new Map([['diagrams/x.svg', '<svg xmlns="http://www.w3.org/2000/svg"/>']]);

function input(overrides: Partial<Parameters<typeof validateContent>[0]> = {}) {
  return {
    tracks: [baseTrack()], lessons: [baseLesson()],
    questions: [baseQuestion()], flashcards: [baseCard()], exams: [baseExam()],
    diagramFiles: diagrams, ...overrides,
  };
}

describe('validateContent', () => {
  it('accepts a fully consistent bundle', () => {
    expect(validateContent(input())).toEqual([]);
  });

  it('flags duplicate question ids with file context', () => {
    const q2 = { ...baseQuestion(), id: 'q1' };
    const d = validateContent(input({ questions: [baseQuestion(), q2] }));
    expect(d.some((x) => x.message.includes('duplicate') && x.message.includes('q1'))).toBe(true);
  });

  it('flags a lesson whose module does not exist', () => {
    const l = { ...baseLesson(), module: 'nope' };
    const d = validateContent(input({ lessons: [l] }));
    expect(d.some((x) => x.message.includes('nope'))).toBe(true);
  });

  it('flags a missing diagram file', () => {
    const l = baseLesson();
    l.diagrams = [{ title: 'd', file: 'diagrams/missing.svg' }];
    const d = validateContent(input({ lessons: [l] }));
    expect(d.some((x) => x.file.includes('lesson') && x.message.includes('missing.svg'))).toBe(true);
  });

  it('flags a lesson with no video', () => {
    const l = { ...baseLesson(), videos: [] };
    const d = validateContent(input({ lessons: [l] }));
    expect(d.some((x) => x.message.includes('video'))).toBe(true);
  });

  it('flags an exam whose group tag has no bank questions', () => {
    const e = baseExam();
    e.groups = [{ tag: 'ch9', count: 1 }];
    const d = validateContent(input({ exams: [e] }));
    expect(d.some((x) => x.message.includes('ch9'))).toBe(true);
  });

  it('flags an exam whose K quota exceeds bank capacity', () => {
    const e = baseExam();
    e.total = 2; e.klevels = { K1: 2, K2: 0, K3: 0 };
    e.groups = [{ tag: 'ch1', count: 2 }];
    const d = validateContent(input({
      questions: [baseQuestion(), { ...baseQuestion(), id: 'q2', klevel: 'K2' }],
      exams: [e],
    }));
    expect(d.some((x) => x.message.includes('K1'))).toBe(true);
  });

  it('flags a bank that passes supply checks but cannot be assembled', () => {
    // Every ch1 question is multi-select while the exam forbids multi-selects:
    // per-tag supply (1) and K supply both pass, but assembleExam throws 100%.
    const multiOnly = { ...baseQuestion(), type: 'multi' as const, answers: [0, 1] };
    const d = validateContent(input({ questions: [multiOnly] }));
    const diag = d.find((x) => x.file === 'exam:e1' && x.message.includes('cannot assemble'));
    expect(diag).toBeTruthy();
    expect(diag!.message).toContain('group ch1 could not draw 1');
  });

  it('does not report assembly diagnostics for a satisfiable exam', () => {
    expect(validateContent(input()).filter((x) => x.message.includes('cannot assemble'))).toEqual([]);
  });

  it('flags a track referencing a missing exam', () => {
    const t = baseTrack();
    t.readiness.examIds = ['missing-exam'];
    const d = validateContent(input({ tracks: [t] }));
    expect(d.some((x) => x.message.includes('missing-exam'))).toBe(true);
  });

  it('flags duplicate flashcard ids', () => {
    const d = validateContent(input({ flashcards: [baseCard(), baseCard()] }));
    expect(d.some((x) => x.message.includes('c1'))).toBe(true);
  });

  it('enforces declared bank floors', () => {
    const d = validateContent(input({ bankFloors: [{ tag: 'ch1', minimum: 5 }] })); // 1 question < 5
    expect(d.some((x) => x.message.includes('group ch1 bank floor 5 unmet (have 1)'))).toBe(true);
  });

  it('passes when bank floors are met', () => {
    const qs = Array.from({ length: 5 }, (_, i) => ({ ...baseQuestion(), id: `q${i}` }));
    const d = validateContent(input({ questions: qs, bankFloors: [{ tag: 'ch1', minimum: 5 }] }));
    expect(d).toEqual([]);
  });

  it('aggregated diagnostics include question capacity violations', () => {
    const e = baseExam(); e.groups = [{ tag: 'ch1', count: 8 }]; // bank has 1
    const d = validateContent(input({ exams: [e] }));
    expect(d.some((x) => x.message.includes('needs 8 questions'))).toBe(true);
  });

  it('reports no diagnostics for a satisfiable schema-v2 exam', () => {
    const e = baseExam();
    e.total = 2;
    e.groups = [{ tag: 'ch1', count: 2, klevels: { K1: 1, K2: 1, K3: 0 } }];
    const d = validateContent(input({
      questions: [
        { ...baseQuestion(), id: 'q1', klevel: 'K1' },
        { ...baseQuestion(), id: 'q2', klevel: 'K2' },
      ],
      exams: [e],
    }));
    expect(d).toEqual([]);
  });

  it('flags a schema-v2 exam whose per-group K supply is short in the bank', () => {
    const e = baseExam();
    e.total = 2;
    e.groups = [{ tag: 'ch1', count: 2, klevels: { K1: 2, K2: 0, K3: 0 } }];
    const d = validateContent(input({
      questions: [
        { ...baseQuestion(), id: 'q1', klevel: 'K1' },
        { ...baseQuestion(), id: 'q2', klevel: 'K2' }, // ch1 K1 supply: 1, cell needs 2
      ],
      exams: [e],
    }));
    expect(d.some((x) => x.file === 'exam:e1'
      && x.message.includes('group ch1 needs 2 K1 questions, bank has 1'))).toBe(true);
    // The assembly pass names the starved cell as well.
    expect(d.some((x) => x.message.includes('group ch1 could not draw 1 K1'))).toBe(true);
  });

  it('counts a multi-tag klevel\'d question once in the legacy global-K supply', () => {
    // Task 2's ledgered carry-in (fixed in Task 4): kCount used to increment
    // inside the per-tag loop, so a double-tagged question inflated the legacy
    // global-K supply. Two K1 questions double-tagged ch1+ch9 must count as
    // supply 2 — a global K1 quota of 3 is a shortfall, not a pass.
    const e = baseExam();
    e.total = 3;
    e.klevels = { K1: 3, K2: 0, K3: 0 };
    e.groups = [{ tag: 'ch1', count: 3 }];
    const d = validateContent(input({
      questions: [
        { ...baseQuestion(), id: 'q1', tags: ['ch1', 'ch9'] },
        { ...baseQuestion(), id: 'q2', tags: ['ch1', 'ch9'] },
      ],
      exams: [e],
    }));
    expect(d.some((x) => x.message.includes('K1 quota 3 exceeds bank supply 2'))).toBe(true);
  });

  it('assembles all five shipped mock exams from the real bank with zero diagnostics', () => {
    // Integration with the authored content: the five M3 mock definitions
    // (content/exams/istqb-mock-*.toml) must validate against the REAL 192-question
    // bank — every per-(chapter x K) cell supplied and every assembly (validator
    // runs assembleExam per exam) succeeding. A regression in either the
    // definitions or the bank fails here, not only at app runtime.
    const pieces = collectContent(CONTENT_ROOT);
    const diagnostics = validateContent({
      ...pieces,
      diagramFiles: new Map(Object.entries(pieces.diagrams)),
      bankFloors: readBankFloors(CONTENT_ROOT),
    });
    expect(diagnostics).toEqual([]);

    const mocks = pieces.exams.filter((e) => e.id.startsWith('istqb-mock-'));
    expect(mocks.map((e) => e.id)).toEqual([
      'istqb-mock-1', 'istqb-mock-2', 'istqb-mock-3', 'istqb-mock-4', 'istqb-mock-5',
    ]);
    // Reconciled official blueprint, pinned so a cell drift fails loudly:
    // 40 questions; per-(chapter x K) cells summing exactly to K1 8 / K2 24 / K3 8.
    // ch3 was corrected in M3 Task 3 from M2's mis-split 1/3 to the official 2/2.
    const expectedCells = [
      { tag: 'ch1', count: 8, klevels: { K1: 2, K2: 6, K3: 0 } },
      { tag: 'ch2', count: 6, klevels: { K1: 2, K2: 4, K3: 0 } },
      { tag: 'ch3', count: 4, klevels: { K1: 2, K2: 2, K3: 0 } },
      { tag: 'ch4', count: 11, klevels: { K1: 0, K2: 6, K3: 5 } },
      { tag: 'ch5', count: 9, klevels: { K1: 1, K2: 5, K3: 3 } },
      { tag: 'ch6', count: 2, klevels: { K1: 1, K2: 1, K3: 0 } },
    ];
    for (const mock of mocks) {
      expect(mock.groups).toEqual(expectedCells);
      expect(mock.total).toBe(40);
      expect(mock.blueprintExact).toBe(true);
      expect(mock.klevels).toEqual({ K1: 8, K2: 24, K3: 8 });
    }
    // The five are identical-blueprint variants: same cells, distinct titles.
    expect(new Set(mocks.map((m) => m.title)).size).toBe(5);
    expect(mocks.every((m) => m.title.startsWith('ISTQB CTFL Mock Exam '))).toBe(true);
  });
});
