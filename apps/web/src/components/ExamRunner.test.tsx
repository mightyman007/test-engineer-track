import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { ExamRunner } from './ExamRunner.js';
import { ContentProvider } from '../lib/content-context.js';
import { SessionProvider } from '../state/session.js';
import { assembleExam } from 'tet-core';
import type { ContentBundle, Question } from 'tet-core';
import type { ExamAttempt, StorageAdapter } from 'tet-storage';

function q(id: string, tag: string, k: 'K1' | 'K2' | 'K3'): Question {
  return { id, type: 'single', stem: `stem-${id}`, options: ['a', 'b', 'c', 'd'], answers: [0], explanation: `expl-${id}`, tags: [tag], klevel: k };
}

const questions: Question[] = [
  q('a1', 'ch1', 'K1'), q('a2', 'ch1', 'K2'), q('a3', 'ch1', 'K3'), q('a4', 'ch1', 'K2'),
  q('b1', 'ch2', 'K1'), q('b2', 'ch2', 'K2'), q('b3', 'ch2', 'K2'), q('b4', 'ch2', 'K2'),
];

const bundle: ContentBundle = {
  tracks: [{
    id: 't1', title: 'T', description: 'D', order: 1,
    modules: [{ id: 'm1', track: 't1', title: 'M1', order: 1, source: 'x', quizPool: 'x', deck: 'x', lessonIds: [] }],
    readiness: { examIds: ['e1'], passPct: 65, readyPct: 80 },
  }],
  lessons: {},
  questions,
  flashcards: [], diagrams: {}, questionsByModule: {}, cardsByModule: {},
  exams: [{
    id: 'e1', track: 't1', title: 'Mock 1', timeLimitMin: 60, passPct: 65, total: 4, multiSelectMax: 1,
    groups: [{ tag: 'ch1', count: 2 }, { tag: 'ch2', count: 2 }],
    klevels: { K1: 1, K2: 2, K3: 1 },
  }],
};

const examAttempts: ExamAttempt[] = [];
const drafts: Record<string, unknown> = {};
const adapter: Partial<StorageAdapter> = {
  getSession: () => Promise.resolve(null),
  getExamAttempts: () => Promise.resolve(examAttempts),
  recordExamAttempt: async (a) => { examAttempts.push(a); },
  getExamDraft: (id) => Promise.resolve((drafts[id] as never) ?? null),
  putExamDraft: async (d) => { drafts[d.examId] = d; },
  clearExamDraft: async (id) => { delete drafts[id]; },
};

// Fake only the intervals the runner schedules (countdown + autosave).
// Fully faked timers hang this stack: user-event and RTL's async wrapper
// both await a REAL setTimeout(0), which fake timers would never release.
// Also reset the shared fixtures so every test starts hermetic.
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
  examAttempts.length = 0;
  for (const key of Object.keys(drafts)) delete drafts[key];
});
afterEach(() => vi.useRealTimers());

function mount() {
  return render(
    <MemoryRouter initialEntries={['/exam/e1']}>
      <SessionProvider adapter={adapter as StorageAdapter}>
        <ContentProvider seed={bundle}>
          <Routes>
            <Route path="/exam/:examId" element={<ExamRunner />} />
            <Route path="/exam/:examId/report/:attemptId" element={<p>REPORT</p>} />
          </Routes>
        </ContentProvider>
      </SessionProvider>
    </MemoryRouter>,
  );
}

describe('ExamRunner', () => {
  it('renders an assembled blueprint exam with a countdown and flag toggles', async () => {
    mount();
    await screen.findByText(/mock 1/i);
    expect(screen.getByText(/60:00/)).toBeTruthy();
    expect(screen.getAllByText(/flag/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/stem-/).length).toBe(4);
  });

  it('autosaves a draft after 15s and submits a scored attempt on finish', async () => {
    mount();
    // Any assembled stem will do: the blueprint draws 2-of-4 per tag from a
    // time seed, so which questions appear is draw luck — pin the shape, not
    // the draw. Every question's correct option is 'a', so answering the
    // first rendered question scores exactly 1.
    await screen.findAllByText(/stem-/);
    // answer the visible question
    await userEvent.click(screen.getAllByRole('button', { name: 'a' })[0]!);
    await vi.advanceTimersByTimeAsync(15_500);
    await waitFor(() => expect(drafts['e1']).toBeTruthy());

    await userEvent.click(screen.getByRole('button', { name: /submit exam/i }));
    await waitFor(() => expect(examAttempts).toHaveLength(1));
    const attempt = examAttempts[0]!;
    expect(attempt.attemptId).toBeTruthy();
    // Shape assertions (pin the blueprint shape, not the draw): the blueprint
    // forces exactly tags ch1/ch2 with 2 questions each, and the single
    // answered question is always the correct option, so the per-tag correct
    // counts must sum to the score.
    expect(attempt.max).toBe(4);
    expect(attempt.score).toBe(1);
    expect(Object.keys(attempt.perTag).sort()).toEqual(['ch1', 'ch2']);
    expect(attempt.perTag.ch1!.total).toBe(2);
    expect(attempt.perTag.ch2!.total).toBe(2);
    expect(Object.values(attempt.perTag).reduce((n, v) => n + v.correct, 0)).toBe(attempt.score);
    await waitFor(() => expect(drafts['e1']).toBeUndefined());
  });

  it('restores responses, flags, and remaining time from a saved draft', async () => {
    // Key the draft to the questions seed 42 assembles, so the assertions are
    // deterministic rather than draw luck.
    const assembled42 = assembleExam(bundle.exams[0]!, questions, 42);
    const ids = assembled42.questions.map((x) => x.id);
    drafts['e1'] = {
      examId: 'e1',
      responses: { [ids[0]!]: [0], [ids[1]!]: [0] },
      flags: [ids[2]!],
      startedAt: '2026-01-01T00:00:00.000Z',
      remainingSec: 1200,
      seed: 42,
    };
    mount();
    await screen.findAllByText(/stem-/);
    // Restored single-choice answers render as pressed option buttons.
    expect(screen.getAllByRole('button', { name: 'a', pressed: true })).toHaveLength(2);
    // The flagged question shows its star (exactly one was flagged).
    expect(screen.getAllByText('★ flagged')).toHaveLength(1);
    // Restored clock: 1200s = 20:00.
    expect(screen.getByText('20:00')).toBeTruthy();
    // A live clock must not auto-submit.
    expect(examAttempts).toHaveLength(0);
  });

  it('auto-submits exactly once when the restored draft is already expired', async () => {
    drafts['e1'] = {
      examId: 'e1', responses: {}, flags: [],
      startedAt: '2026-01-01T00:00:00.000Z', remainingSec: 0,
    };
    mount();
    await waitFor(() => expect(drafts['e1']).toBeUndefined());
    // Auto-submit fired on load — exactly once.
    expect(examAttempts).toHaveLength(1);
    // The once-guard holds: passing time must not submit again.
    await vi.advanceTimersByTimeAsync(5_000);
    expect(examAttempts).toHaveLength(1);
  });

  it('resumes the seeded assembly deterministically and records a self-consistent attempt', async () => {
    const assembled42 = assembleExam(bundle.exams[0]!, questions, 42);
    const ids = assembled42.questions.map((x) => x.id);
    drafts['e1'] = {
      examId: 'e1',
      responses: { [ids[0]!]: [0], [ids[1]!]: [0] },
      flags: [],
      startedAt: '2026-01-01T00:00:00.000Z',
      remainingSec: 1200,
      seed: 42,
    };
    mount();
    await screen.findAllByText(/stem-/);
    // No auto-submit on a live clock.
    expect(examAttempts).toHaveLength(0);
    // The rendered exam IS the seed-42 assembly, in assembly order.
    expect(screen.getAllByText(/stem-/).map((el) => el.textContent))
      .toEqual(assembled42.questions.map((x) => x.stem));
    await userEvent.click(screen.getByRole('button', { name: /submit exam/i }));
    await waitFor(() => expect(examAttempts).toHaveLength(1));
    const attempt = examAttempts[0]!;
    // Recorded responses are projected onto the assembled set: every key is
    // an assembled question id, and every restored response survived.
    const attemptIds = Object.keys(attempt.responses);
    expect(attemptIds.every((id) => ids.includes(id))).toBe(true);
    expect(ids[0]! in attempt.responses).toBe(true);
    expect(ids[1]! in attempt.responses).toBe(true);
    expect(attempt.score).toBe(2);
    await waitFor(() => expect(drafts['e1']).toBeUndefined());
  });
});
