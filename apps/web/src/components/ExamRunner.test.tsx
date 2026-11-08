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
const recordExamAttempt = vi.fn(async (a: ExamAttempt) => { examAttempts.push(a); });
const adapter: Partial<StorageAdapter> = {
  getSession: () => Promise.resolve(null),
  getExamAttempts: () => Promise.resolve(examAttempts),
  recordExamAttempt,
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
  recordExamAttempt.mockClear();
  recordExamAttempt.mockImplementation(async (a: ExamAttempt) => { examAttempts.push(a); });
  for (const key of Object.keys(drafts)) delete drafts[key];
});
afterEach(() => vi.useRealTimers());

function mount(b: ContentBundle = bundle, a: Partial<StorageAdapter> = adapter) {
  return render(
    <MemoryRouter initialEntries={['/exam/e1']}>
      <SessionProvider adapter={a as StorageAdapter}>
        <ContentProvider seed={b}>
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
    // The draft-resume effect restores responses, flags, and the remaining
    // clock in ONE commit — so gate on the restored clock ('20:00', vs the
    // fresh exam's '60:00') before asserting restored state. A bare
    // findAllByText(/stem-/) gate resolves on the initial fresh-seed commit
    // (RTL's waitFor checks immediately, before the resume re-render lands)
    // and raced these assertions ~1-in-10 under the fake-timer seam.
    await screen.findByText('20:00');
    // Restored single-choice answers render as pressed option buttons.
    expect(screen.getAllByRole('button', { name: 'a', pressed: true })).toHaveLength(2);
    // The flagged question shows its star (exactly one was flagged).
    expect(screen.getAllByText('★ flagged')).toHaveLength(1);
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
    // Gate on the restored clock: the resume commit re-assembles with the
    // draft's seed AND swaps the clock to the draft's remaining time in the
    // same render, so '20:00' proves the resumed assembly is on screen. A
    // bare findAllByText(/stem-/) gate resolves on the transient fresh-seed
    // commit (RTL's waitFor checks immediately) and raced the order
    // assertion ~1-in-10 under the fake-timer seam.
    await screen.findByText('20:00');
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

  it('surfaces a submit failure, keeps the draft, and allows a retry', async () => {
    recordExamAttempt.mockRejectedValueOnce(new Error('request failed: 500'));
    mount();
    await screen.findAllByText(/stem-/);
    // Get a draft on disk first (autosave), so the test can assert it survives.
    await userEvent.click(screen.getAllByRole('button', { name: 'a' })[0]!);
    await vi.advanceTimersByTimeAsync(15_500);
    await waitFor(() => expect(drafts['e1']).toBeTruthy());

    await userEvent.click(screen.getByRole('button', { name: /submit exam/i }));

    const banner = await screen.findByRole('alert');
    expect(banner.textContent).toMatch(/submit failed/i);
    expect(banner.textContent).toMatch(/answers are preserved/i);
    expect(screen.queryByText('REPORT')).toBeNull(); // did NOT navigate
    expect(drafts['e1']).toBeTruthy();               // draft NOT cleared

    // The learner can retry: the second submit succeeds and navigates.
    await userEvent.click(screen.getByRole('button', { name: /submit exam/i }));
    await waitFor(() => expect(screen.getByText('REPORT')).toBeTruthy());
    expect(examAttempts).toHaveLength(1);
  });

  it('auto-submits exactly once even when the submit keeps failing (no error loop)', async () => {
    recordExamAttempt.mockRejectedValue(new Error('request failed: 500'));
    drafts['e1'] = {
      examId: 'e1', responses: {}, flags: [],
      startedAt: '2026-01-01T00:00:00.000Z', remainingSec: 0,
    };
    mount();
    await waitFor(() => expect(recordExamAttempt).toHaveBeenCalledTimes(1));
    expect(screen.getByRole('alert').textContent).toMatch(/submit failed/i);
    // Passing time must not re-fire the failed auto-submit in a loop — the
    // learner retries manually via the submit button.
    await vi.advanceTimersByTimeAsync(5_000);
    expect(recordExamAttempt).toHaveBeenCalledTimes(1);
  });

  it('renders an assembly error card instead of crashing on an unsatisfiable exam', async () => {
    // ch1 has 4 bank questions; demanding 5 makes assembly impossible even
    // though the exam definition itself is present.
    const unsatisfiable: ContentBundle = {
      ...bundle,
      exams: [{ ...bundle.exams[0]!, total: 6, groups: [{ tag: 'ch1', count: 5 }, { tag: 'ch2', count: 1 }] }],
    };
    mount(unsatisfiable);
    const card = await screen.findByRole('alert');
    expect(card.textContent).toContain('could not be assembled from the current question bank');
    expect(card.textContent).toContain('pnpm --filter tet-content build');
    expect(screen.queryByText(/flag for review/i)).toBeNull(); // no exam UI rendered
  });
});
