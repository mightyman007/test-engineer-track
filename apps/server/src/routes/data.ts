import { Hono } from 'hono';
import type { AppEnv } from '../auth.js';
import { requireAuth } from '../auth.js';
import type { DB } from '../db.js';

export function dataRoutes(): Hono<AppEnv> {
  const r = new Hono<AppEnv>();
  r.use('*', requireAuth());

  r.get('/progress', (c) => {
    const rows = c.get('db').prepare('SELECT key, track, module, item_id, status, updated_at FROM progress WHERE user_id = ?')
      .all(c.get('user')!.id) as Array<{ key: string; track: string; module: string; item_id: string; status: string; updated_at: string }>;
    const map: Record<string, unknown> = {};
    for (const row of rows) {
      map[row.key] = { track: row.track, module: row.module, itemId: row.item_id, status: row.status, updatedAt: row.updated_at };
    }
    return c.json(map);
  });

  r.put('/progress', async (c) => {
    const body = await c.req.json<{ entries: Array<{ track: string; module: string; itemId: string; status: string; updatedAt: string }> }>().catch(() => null);
    if (!body) return c.json({ error: 'invalid JSON body' }, 400);
    const { entries } = body;
    const stmt = c.get('db').prepare(`
      INSERT INTO progress (user_id, key, track, module, item_id, status, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT (user_id, key) DO UPDATE SET status = excluded.status, updated_at = excluded.updated_at`);
    for (const e of entries) {
      stmt.run(c.get('user')!.id, `${e.track}/${e.module}/${e.itemId}`, e.track, e.module, e.itemId, e.status, e.updatedAt);
    }
    return c.body(null, 204);
  });

  r.post('/attempts/quiz', async (c) => {
    const a = await c.req.json<{ attemptId: string; module: string; score: number; max: number; perQuestion: Record<string, boolean>; createdAt: string }>().catch(() => null);
    if (!a) return c.json({ error: 'invalid JSON body' }, 400);
    const info = c.get('db').prepare(`
      INSERT OR IGNORE INTO quiz_attempts (user_id, attempt_id, module, score, max_score, per_question, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)`)
      .run(c.get('user')!.id, a.attemptId, a.module, a.score, a.max, JSON.stringify(a.perQuestion), a.createdAt);
    return c.json({ duplicate: info.changes === 0 });
  });

  r.get('/attempts/quiz', (c) => {
    const moduleId = c.req.query('module');
    const rows = c.get('db').prepare(`
      SELECT attempt_id, module, score, max_score, per_question, created_at
      FROM quiz_attempts WHERE user_id = ? ${moduleId ? 'AND module = ?' : ''}
      ORDER BY created_at DESC`)
      .all(...(moduleId ? [c.get('user')!.id, moduleId] : [c.get('user')!.id])) as Array<Record<string, unknown>>;
    return c.json(rows.map((row) => ({
      attemptId: row.attempt_id, module: row.module, score: row.score, max: row.max_score,
      perQuestion: JSON.parse(String(row.per_question)), createdAt: row.created_at,
    })));
  });

  r.post('/attempts/exam', async (c) => {
    const a = await c.req.json<{ attemptId: string; examId: string; score: number; max: number; passed: boolean; scorePct: number; perTag: Record<string, { correct: number; total: number }>; responses: Record<string, number[]>; createdAt: string; durationSec: number }>().catch(() => null);
    if (!a) return c.json({ error: 'invalid JSON body' }, 400);
    const info = c.get('db').prepare(`
      INSERT OR IGNORE INTO exam_attempts
        (user_id, attempt_id, exam_id, score, max_score, passed, score_pct, per_tag, responses, duration_sec, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(c.get('user')!.id, a.attemptId, a.examId, a.score, a.max, a.passed ? 1 : 0, a.scorePct,
        JSON.stringify(a.perTag), JSON.stringify(a.responses), a.durationSec, a.createdAt);
    return c.json({ duplicate: info.changes === 0 });
  });

  r.get('/attempts/exam', (c) => {
    const examId = c.req.query('examId');
    const rows = c.get('db').prepare(`
      SELECT attempt_id, exam_id, score, max_score, passed, score_pct, per_tag, responses, duration_sec, created_at
      FROM exam_attempts WHERE user_id = ? ${examId ? 'AND exam_id = ?' : ''}
      ORDER BY created_at DESC`)
      .all(...(examId ? [c.get('user')!.id, examId] : [c.get('user')!.id])) as Array<Record<string, unknown>>;
    return c.json(rows.map((row) => ({
      attemptId: row.attempt_id, examId: row.exam_id, score: row.score, max: row.max_score,
      passed: row.passed === 1, scorePct: row.score_pct,
      perTag: JSON.parse(String(row.per_tag)), responses: JSON.parse(String(row.responses)),
      durationSec: row.duration_sec, createdAt: row.created_at,
    })));
  });

  r.post('/reviews', async (c) => {
    const rev = await c.req.json<{ cardId: string; grade: string; state: { ease: number; intervalDays: number; dueAt: string; reps: number; lapses: number }; createdAt: string }>().catch(() => null);
    if (!rev) return c.json({ error: 'invalid JSON body' }, 400);
    const db = c.get('db');
    const tx = db.transaction(() => {
      db.prepare(`INSERT INTO card_reviews (user_id, card_id, grade, ease, interval_days, due_at, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)`)
        .run(c.get('user')!.id, rev.cardId, rev.grade, rev.state.ease, rev.state.intervalDays, rev.state.dueAt, rev.createdAt);
      db.prepare(`INSERT INTO card_states (user_id, card_id, ease, interval_days, due_at, reps, lapses, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT (user_id, card_id) DO UPDATE SET
          ease = excluded.ease, interval_days = excluded.interval_days, due_at = excluded.due_at,
          reps = excluded.reps, lapses = excluded.lapses, updated_at = excluded.updated_at`)
        .run(c.get('user')!.id, rev.cardId, rev.state.ease, rev.state.intervalDays, rev.state.dueAt, rev.state.reps, rev.state.lapses, rev.createdAt);
    });
    tx();
    return c.body(null, 204);
  });

  r.get('/reviews', (c) => {
    const rows = c.get('db').prepare('SELECT card_id, ease, interval_days, due_at, reps, lapses FROM card_states WHERE user_id = ?')
      .all(c.get('user')!.id) as Array<{ card_id: string; ease: number; interval_days: number; due_at: string; reps: number; lapses: number }>;
    const out: Record<string, unknown> = {};
    for (const row of rows) {
      out[row.card_id] = { ease: row.ease, intervalDays: row.interval_days, dueAt: row.due_at, reps: row.reps, lapses: row.lapses };
    }
    return c.json(out);
  });

  r.post('/import', async (c) => {
    const data = await c.req.json<{ progress: Record<string, { track: string; module: string; itemId: string; status: string; updatedAt: string }>; quizAttempts: Array<{ attemptId: string; module: string; score: number; max: number; perQuestion: Record<string, boolean>; createdAt: string }>; examAttempts: Array<{ attemptId: string; examId: string; score: number; max: number; passed: boolean; scorePct: number; perTag: Record<string, { correct: number; total: number }>; responses: Record<string, number[]>; createdAt: string; durationSec: number }>; cardStates: Record<string, { ease: number; intervalDays: number; dueAt: string; reps: number; lapses: number }> }>().catch(() => null);
    if (!data) return c.json({ error: 'invalid JSON body' }, 400);
    const db = c.get('db');
    const uid = c.get('user')!.id;
    const tx = db.transaction(() => {
      for (const e of Object.values(data.progress)) {
        db.prepare(`INSERT INTO progress (user_id, key, track, module, item_id, status, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT (user_id, key) DO UPDATE SET status = excluded.status, updated_at = excluded.updated_at`)
          .run(uid, `${e.track}/${e.module}/${e.itemId}`, e.track, e.module, e.itemId, e.status, e.updatedAt);
      }
      for (const a of data.quizAttempts) {
        db.prepare(`INSERT OR IGNORE INTO quiz_attempts (user_id, attempt_id, module, score, max_score, per_question, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)`)
          .run(uid, a.attemptId, a.module, a.score, a.max, JSON.stringify(a.perQuestion), a.createdAt);
      }
      for (const a of data.examAttempts) {
        db.prepare(`INSERT OR IGNORE INTO exam_attempts (user_id, attempt_id, exam_id, score, max_score, passed, score_pct, per_tag, responses, duration_sec, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
          .run(uid, a.attemptId, a.examId, a.score, a.max, a.passed ? 1 : 0, a.scorePct,
            JSON.stringify(a.perTag), JSON.stringify(a.responses), a.durationSec, a.createdAt);
      }
      for (const [cardId, s] of Object.entries(data.cardStates)) {
        db.prepare(`INSERT INTO card_states (user_id, card_id, ease, interval_days, due_at, reps, lapses, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT (user_id, card_id) DO UPDATE SET
            ease = excluded.ease, interval_days = excluded.interval_days, due_at = excluded.due_at,
            reps = excluded.reps, lapses = excluded.lapses, updated_at = excluded.updated_at`)
          .run(uid, cardId, s.ease, s.intervalDays, s.dueAt, s.reps, s.lapses, new Date().toISOString());
      }
    });
    tx();
    return c.body(null, 204);
  });

  return r;
}
