import { describe, expect, it } from 'vitest';
import { validateContent } from './validate.js';
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
});
