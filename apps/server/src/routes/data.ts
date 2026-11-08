import { Hono } from 'hono';
import type { AppEnv } from '../auth.js';
import { requireAuth } from '../auth.js';

export function dataRoutes(): Hono<AppEnv> {
  const r = new Hono<AppEnv>();
  r.use('*', requireAuth());

  r.get('/progress', async (c) => {
    const rows = await c.get('store').getProgress(c.get('user')!.id);
    const map: Record<string, unknown> = {};
    for (const row of rows) {
      map[row.key] = { track: row.track, module: row.module, itemId: row.itemId, status: row.status, updatedAt: row.updatedAt };
    }
    return c.json(map);
  });

  r.put('/progress', async (c) => {
    const body = await c.req.json<{ entries: Array<{ track: string; module: string; itemId: string; status: string; updatedAt: string }> }>().catch(() => null);
    if (!body) return c.json({ error: 'invalid JSON body' }, 400);
    const { entries } = body;
    await c.get('store').putProgress(c.get('user')!.id, entries.map((e) => ({
      key: `${e.track}/${e.module}/${e.itemId}`, track: e.track, module: e.module,
      itemId: e.itemId, status: e.status as 'done' | 'in-progress', updatedAt: e.updatedAt,
    })));
    return c.body(null, 204);
  });

  r.post('/attempts/quiz', async (c) => {
    const a = await c.req.json<{ attemptId: string; module: string; score: number; max: number; perQuestion: Record<string, boolean>; createdAt: string }>().catch(() => null);
    if (!a) return c.json({ error: 'invalid JSON body' }, 400);
    const inserted = await c.get('store').recordQuizAttempt(c.get('user')!.id, {
      attemptId: a.attemptId, module: a.module, score: a.score, max: a.max,
      perQuestion: a.perQuestion, createdAt: a.createdAt,
    });
    return c.json({ duplicate: !inserted });
  });

  r.get('/attempts/quiz', async (c) => {
    const moduleId = c.req.query('module');
    const rows = await c.get('store').getQuizAttempts(c.get('user')!.id, moduleId);
    return c.json(rows.map((row) => ({
      attemptId: row.attemptId, module: row.module, score: row.score, max: row.max,
      perQuestion: row.perQuestion, createdAt: row.createdAt,
    })));
  });

  r.post('/attempts/exam', async (c) => {
    const a = await c.req.json<{ attemptId: string; examId: string; score: number; max: number; passed: boolean; scorePct: number; perTag: Record<string, { correct: number; total: number }>; responses: Record<string, number[]>; createdAt: string; durationSec: number }>().catch(() => null);
    if (!a) return c.json({ error: 'invalid JSON body' }, 400);
    const inserted = await c.get('store').recordExamAttempt(c.get('user')!.id, {
      attemptId: a.attemptId, examId: a.examId, score: a.score, max: a.max, passed: a.passed,
      scorePct: a.scorePct, perTag: a.perTag, responses: a.responses,
      createdAt: a.createdAt, durationSec: a.durationSec,
    });
    return c.json({ duplicate: !inserted });
  });

  r.get('/attempts/exam', async (c) => {
    const examId = c.req.query('examId');
    const rows = await c.get('store').getExamAttempts(c.get('user')!.id, examId);
    return c.json(rows.map((row) => ({
      attemptId: row.attemptId, examId: row.examId, score: row.score, max: row.max,
      passed: row.passed, scorePct: row.scorePct,
      perTag: row.perTag, responses: row.responses,
      durationSec: row.durationSec, createdAt: row.createdAt,
    })));
  });

  r.post('/reviews', async (c) => {
    const rev = await c.req.json<{ cardId: string; grade: string; state: { ease: number; intervalDays: number; dueAt: string; reps: number; lapses: number }; createdAt: string }>().catch(() => null);
    if (!rev) return c.json({ error: 'invalid JSON body' }, 400);
    await c.get('store').recordCardReview(c.get('user')!.id, {
      cardId: rev.cardId, grade: rev.grade, state: rev.state, createdAt: rev.createdAt,
    });
    return c.body(null, 204);
  });

  r.get('/reviews', async (c) => {
    const rows = await c.get('store').getReviewState(c.get('user')!.id);
    const out: Record<string, unknown> = {};
    for (const row of rows) {
      out[row.cardId] = { ease: row.ease, intervalDays: row.intervalDays, dueAt: row.dueAt, reps: row.reps, lapses: row.lapses };
    }
    return c.json(out);
  });

  r.put('/exam-draft/:examId', async (c) => {
    const draft = await c.req.json<Record<string, unknown>>().catch(() => null);
    if (!draft) return c.json({ error: 'invalid JSON body' }, 400);
    await c.get('store').putExamDraft(c.get('user')!.id, c.req.param('examId'), JSON.stringify(draft), new Date().toISOString());
    return c.body(null, 204);
  });

  r.get('/exam-draft/:examId', async (c) => {
    const draft = await c.get('store').getExamDraft(c.get('user')!.id, c.req.param('examId'));
    if (draft === null) return c.body(null, 204);
    return c.body(draft, 200, { 'content-type': 'application/json' });
  });

  r.delete('/exam-draft/:examId', async (c) => {
    await c.get('store').deleteExamDraft(c.get('user')!.id, c.req.param('examId'));
    return c.body(null, 204);
  });

  r.post('/import', async (c) => {
    const data = await c.req.json<{ progress: Record<string, { track: string; module: string; itemId: string; status: string; updatedAt: string }>; quizAttempts: Array<{ attemptId: string; module: string; score: number; max: number; perQuestion: Record<string, boolean>; createdAt: string }>; examAttempts: Array<{ attemptId: string; examId: string; score: number; max: number; passed: boolean; scorePct: number; perTag: Record<string, { correct: number; total: number }>; responses: Record<string, number[]>; createdAt: string; durationSec: number }>; cardStates: Record<string, { ease: number; intervalDays: number; dueAt: string; reps: number; lapses: number }> }>().catch(() => null);
    if (!data) return c.json({ error: 'invalid JSON body' }, 400);
    const uid = c.get('user')!.id;
    await c.get('store').importAll(uid, {
      progress: Object.values(data.progress).map((e) => ({
        key: `${e.track}/${e.module}/${e.itemId}`, track: e.track, module: e.module,
        itemId: e.itemId, status: e.status as 'done' | 'in-progress', updatedAt: e.updatedAt,
      })),
      quizAttempts: data.quizAttempts,
      examAttempts: data.examAttempts,
      cardStates: Object.entries(data.cardStates).map(([cardId, state]) => ({ cardId, state })),
    });
    return c.body(null, 204);
  });

  return r;
}
