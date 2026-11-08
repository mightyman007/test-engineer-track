import pg from 'pg';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createIamTokenProvider } from './iamToken.js';
import { rosterFromRow } from './sqlite.js';
import type {
  CardReviewInput, CreateUserInput, DataStore, ExamAttemptInput, ExamAttemptRow,
  ImportPayload, InviteRow, ProgressInput, ProgressRow, QuizAttemptInput, QuizAttemptRow,
  ReviewStateRow, RosterRow, Role, SessionAuthRow, UserRow,
} from './types.js';

/**
 * Minimal structural surface of node-pg's Pool/Client the store needs —
 * satisfied by the real `pg.Pool` AND by pg-mem's adapter pool (parity tests).
 */
export interface PgResultLike {
  rows: unknown[];
  rowCount: number | null;
}
export interface PgClientLike {
  query(text: string, values?: unknown[]): Promise<PgResultLike>;
  release(): void;
}
export interface PgPoolLike {
  query(text: string, values?: unknown[]): Promise<PgResultLike>;
  connect(): Promise<PgClientLike>;
  end?(): Promise<void>;
  on?(event: string, listener: (...args: unknown[]) => void): unknown;
}

interface UserDbRow {
  id: number; username: string; display_name: string; password_hash: string; role: string;
  created_at: string; last_seen_at: string | null;
  identity_id: string | null; email: string | null; auth_provider: string;
}
interface SessionAuthDbRow { id: number; username: string; display_name: string; role: string; expires_at: string }
interface InviteDbRow { code: string; uses_left: number; expires_at: string | null; created_by: number }
interface ProgressDbRow { key: string; track: string; module: string; item_id: string; status: string; updated_at: string }
interface QuizAttemptDbRow { attempt_id: string; module: string; score: number; max_score: number; per_question: string; created_at: string }
interface ExamAttemptDbRow { attempt_id: string; exam_id: string; score: number; max_score: number; passed: boolean; score_pct: number; per_tag: string; responses: string; duration_sec: number; created_at: string }
interface ReviewStateDbRow { card_id: string; ease: number; interval_days: number; due_at: string; reps: number; lapses: number }
interface IdDbRow { id: number }

const SCHEMA_PG_SQL = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '..', 'schema.pg.sql'), 'utf8');

/** Exported for the opt-in real-Postgres parity suite (bootstrap + TRUNCATE). */
export { SCHEMA_PG_SQL };

/**
 * Postgres driver (M7): the same queries ported to the PG dialect. IAM auth
 * lives in the pool (see createPgPool); this class only speaks SQL, so parity
 * tests can drive it through pg-mem. The DDL migration runs lazily on first
 * use — the pool is lazy, so constructing the store never opens a connection.
 */
export class PgStore implements DataStore {
  private readonly pool: PgPoolLike;
  private readonly schemaSql: string;
  private readonly onConnectionError?: () => void;
  private migration: Promise<void> | null = null;

  constructor(pool: PgPoolLike, options: { schemaSql?: string; onConnectionError?: () => void } = {}) {
    this.pool = pool;
    this.schemaSql = options.schemaSql ?? SCHEMA_PG_SQL;
    this.onConnectionError = options.onConnectionError;
  }

  private closed = false;

  async close(): Promise<void> {
    if (this.closed) return; // real pg-pool throws on a second end()
    this.closed = true;
    await this.pool.end?.();
  }

  /** Idempotent CREATE TABLE IF NOT EXISTS ... — retried on the next use if it failed. */
  private ready(): Promise<void> {
    if (!this.migration) {
      this.migration = this.pool.query(this.schemaSql).then(
        () => undefined,
        (err: unknown) => {
          this.migration = null;
          throw err;
        },
      );
    }
    return this.migration;
  }

  private async q<T>(text: string, values?: unknown[]): Promise<T[]> {
    await this.ready();
    const res = await this.pool.query(text, values);
    return res.rows as T[];
  }

  /** Transaction helper: one pooled client, BEGIN/COMMIT with ROLLBACK on error. */
  private async tx<T>(fn: (query: (text: string, values?: unknown[]) => Promise<unknown[]>) => Promise<T>): Promise<T> {
    await this.ready();
    let client: PgClientLike;
    try {
      client = await this.pool.connect();
    } catch (err) {
      // Connection/authentication failure: a fresh IAM token is the likely fix.
      this.onConnectionError?.();
      throw err;
    }
    const query = async (text: string, values?: unknown[]): Promise<unknown[]> =>
      (await client.query(text, values)).rows;
    try {
      await client.query('BEGIN');
      const out = await fn(query);
      await client.query('COMMIT');
      return out;
    } catch (err) {
      try { await client.query('ROLLBACK'); } catch { /* connection already lost */ }
      throw err;
    } finally {
      client.release();
    }
  }

  // ---- users ----

  async countUsers(): Promise<number> {
    const rows = await this.q<{ n: number | string }>('SELECT COUNT(*) AS n FROM users');
    return Number(rows[0]?.n ?? 0);
  }

  async getUserById(id: number): Promise<UserRow | null> {
    const rows = await this.q<UserDbRow>('SELECT * FROM users WHERE id = $1', [id]);
    return rows[0] ? userFromPg(rows[0]) : null;
  }

  async getUserByUsername(username: string): Promise<UserRow | null> {
    const rows = await this.q<UserDbRow>('SELECT * FROM users WHERE username = $1', [username]);
    return rows[0] ? userFromPg(rows[0]) : null;
  }

  async getUserByIdentityId(identityId: string): Promise<UserRow | null> {
    const rows = await this.q<UserDbRow>('SELECT * FROM users WHERE identity_id = $1', [identityId]);
    return rows[0] ? userFromPg(rows[0]) : null;
  }

  async createUser(input: CreateUserInput): Promise<number> {
    if (input.inviteCode) {
      // Atomic invite consumption + insert (register flow).
      return this.tx(async (query) => {
        await query('UPDATE invites SET uses_left = uses_left - 1 WHERE code = $1', [input.inviteCode]);
        const rows = await query(
          'INSERT INTO users (username, display_name, password_hash, role, created_at) VALUES ($1, $2, $3, $4, $5) RETURNING id',
          [input.username, input.displayName, input.passwordHash, input.role, input.createdAt],
        ) as IdDbRow[];
        return Number(rows[0]!.id);
      });
    }
    const sql = input.identity
      ? 'INSERT INTO users (username, display_name, password_hash, role, created_at, identity_id, email, auth_provider) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id'
      : 'INSERT INTO users (username, display_name, password_hash, role, created_at) VALUES ($1, $2, $3, $4, $5) RETURNING id';
    const values = input.identity
      ? [input.username, input.displayName, input.passwordHash, input.role, input.createdAt,
          input.identity.identityId, input.identity.email, input.identity.authProvider]
      : [input.username, input.displayName, input.passwordHash, input.role, input.createdAt];
    const rows = await this.q<IdDbRow>(sql, values);
    return Number(rows[0]!.id);
  }

  async updateUserLogin(userId: number, lastSeenAt: string): Promise<void> {
    await this.q('UPDATE users SET last_seen_at = $1 WHERE id = $2', [lastSeenAt, userId]);
  }

  async updateUserSso(userId: number, displayName: string, email: string | null, lastSeenAt: string): Promise<void> {
    await this.q(
      'UPDATE users SET display_name = $1, email = COALESCE($2, email), last_seen_at = $3 WHERE id = $4',
      [displayName, email, lastSeenAt, userId],
    );
  }

  async updateUserPassword(userId: number, passwordHash: string): Promise<boolean> {
    const res = await this.pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, userId]);
    return (res.rowCount ?? 0) > 0;
  }

  // ---- sessions ----

  async insertSession(input: { tokenHash: string; userId: number; expiresAt: string }): Promise<void> {
    await this.q('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES ($1, $2, $3)',
      [input.tokenHash, input.userId, input.expiresAt]);
  }

  async getSessionByTokenHash(tokenHash: string): Promise<SessionAuthRow | null> {
    const rows = await this.q<SessionAuthDbRow>(`
      SELECT u.id, u.username, u.display_name, u.role, s.expires_at
      FROM sessions s JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = $1`, [tokenHash]);
    const row = rows[0];
    return row
      ? { id: row.id, username: row.username, displayName: row.display_name, role: row.role as Role, expiresAt: row.expires_at }
      : null;
  }

  async deleteSessionsForUser(userId: number): Promise<void> {
    await this.q('DELETE FROM sessions WHERE user_id = $1', [userId]);
  }

  // ---- invites ----

  async createInvite(input: { code: string; createdBy: number; usesLeft: number; expiresAt: string | null }): Promise<void> {
    await this.q('INSERT INTO invites (code, created_by, uses_left, expires_at) VALUES ($1, $2, $3, $4)',
      [input.code, input.createdBy, input.usesLeft, input.expiresAt]);
  }

  async listInvites(): Promise<InviteRow[]> {
    const rows = await this.q<InviteDbRow>('SELECT code, uses_left, expires_at, created_by FROM invites ORDER BY id DESC');
    return rows.map((row) => ({
      code: row.code, usesLeft: row.uses_left, expiresAt: row.expires_at, createdBy: row.created_by,
    }));
  }

  async getInviteByCode(code: string): Promise<InviteRow | null> {
    const rows = await this.q<InviteDbRow>('SELECT * FROM invites WHERE code = $1', [code]);
    const row = rows[0];
    return row ? { code: row.code, usesLeft: row.uses_left, expiresAt: row.expires_at, createdBy: row.created_by } : null;
  }

  // ---- progress ----

  async getProgress(userId: number): Promise<ProgressRow[]> {
    const rows = await this.q<ProgressDbRow>(
      'SELECT key, track, module, item_id, status, updated_at FROM progress WHERE user_id = $1', [userId]);
    return rows.map((row) => ({
      key: row.key, track: row.track, module: row.module, itemId: row.item_id,
      status: row.status as ProgressInput['status'], updatedAt: row.updated_at,
    }));
  }

  async putProgress(userId: number, entries: ProgressInput[]): Promise<void> {
    await this.tx(async (query) => {
      for (const e of entries) {
        await query(`INSERT INTO progress (user_id, key, track, module, item_id, status, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (user_id, key) DO UPDATE SET status = EXCLUDED.status, updated_at = EXCLUDED.updated_at`,
          [userId, e.key, e.track, e.module, e.itemId, e.status, e.updatedAt]);
      }
    });
  }

  // ---- attempts ----

  async recordQuizAttempt(userId: number, attempt: QuizAttemptInput): Promise<boolean> {
    // RETURNING gives an unambiguous inserted/duplicate signal: no row when
    // the conflict was ignored (works identically on node-pg and pg-mem).
    const res = await this.pool.query(`
      INSERT INTO quiz_attempts (user_id, attempt_id, module, score, max_score, per_question, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT DO NOTHING RETURNING attempt_id`,
      [userId, attempt.attemptId, attempt.module, attempt.score, attempt.max,
        JSON.stringify(attempt.perQuestion), attempt.createdAt]);
    return res.rows.length > 0;
  }

  async getQuizAttempts(userId: number, moduleId?: string): Promise<QuizAttemptRow[]> {
    const sql = `
      SELECT attempt_id, module, score, max_score, per_question, created_at
      FROM quiz_attempts WHERE user_id = $1 ${moduleId ? 'AND module = $2' : ''}
      ORDER BY created_at DESC`;
    const values = moduleId ? [userId, moduleId] : [userId];
    const rows = await this.q<QuizAttemptDbRow>(sql, values);
    return rows.map((row) => ({
      attemptId: row.attempt_id, module: row.module, score: row.score, max: row.max_score,
      perQuestion: JSON.parse(row.per_question) as Record<string, boolean>, createdAt: row.created_at,
    }));
  }

  async recordExamAttempt(userId: number, attempt: ExamAttemptInput): Promise<boolean> {
    const res = await this.pool.query(`
      INSERT INTO exam_attempts
        (user_id, attempt_id, exam_id, score, max_score, passed, score_pct, per_tag, responses, duration_sec, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT DO NOTHING RETURNING attempt_id`,
      [userId, attempt.attemptId, attempt.examId, attempt.score, attempt.max, attempt.passed,
        attempt.scorePct, JSON.stringify(attempt.perTag), JSON.stringify(attempt.responses),
        attempt.durationSec, attempt.createdAt]);
    return res.rows.length > 0;
  }

  async getExamAttempts(userId: number, examId?: string): Promise<ExamAttemptRow[]> {
    const sql = `
      SELECT attempt_id, exam_id, score, max_score, passed, score_pct, per_tag, responses, duration_sec, created_at
      FROM exam_attempts WHERE user_id = $1 ${examId ? 'AND exam_id = $2' : ''}
      ORDER BY created_at DESC`;
    const values = examId ? [userId, examId] : [userId];
    const rows = await this.q<ExamAttemptDbRow>(sql, values);
    return rows.map((row) => ({
      attemptId: row.attempt_id, examId: row.exam_id, score: row.score, max: row.max_score,
      passed: row.passed, scorePct: row.score_pct,
      perTag: JSON.parse(row.per_tag) as Record<string, { correct: number; total: number }>,
      responses: JSON.parse(row.responses) as Record<string, number[]>,
      durationSec: row.duration_sec, createdAt: row.created_at,
    }));
  }

  // ---- reviews ----

  async recordCardReview(userId: number, review: CardReviewInput): Promise<void> {
    await this.tx(async (query) => {
      await query(`INSERT INTO card_reviews (user_id, card_id, grade, ease, interval_days, due_at, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [userId, review.cardId, review.grade, review.state.ease, review.state.intervalDays,
          review.state.dueAt, review.createdAt]);
      await query(`INSERT INTO card_states (user_id, card_id, ease, interval_days, due_at, reps, lapses, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (user_id, card_id) DO UPDATE SET
          ease = EXCLUDED.ease, interval_days = EXCLUDED.interval_days, due_at = EXCLUDED.due_at,
          reps = EXCLUDED.reps, lapses = EXCLUDED.lapses, updated_at = EXCLUDED.updated_at`,
        [userId, review.cardId, review.state.ease, review.state.intervalDays, review.state.dueAt,
          review.state.reps, review.state.lapses, review.createdAt]);
    });
  }

  async getReviewState(userId: number): Promise<ReviewStateRow[]> {
    const rows = await this.q<ReviewStateDbRow>(
      'SELECT card_id, ease, interval_days, due_at, reps, lapses FROM card_states WHERE user_id = $1', [userId]);
    return rows.map((row) => ({
      cardId: row.card_id, ease: row.ease, intervalDays: row.interval_days,
      dueAt: row.due_at, reps: row.reps, lapses: row.lapses,
    }));
  }

  // ---- exam drafts ----

  async putExamDraft(userId: number, examId: string, draftJson: string, updatedAt: string): Promise<void> {
    await this.q(`INSERT INTO exam_drafts (user_id, exam_id, draft, updated_at)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (user_id, exam_id) DO UPDATE SET draft = EXCLUDED.draft, updated_at = EXCLUDED.updated_at`,
      [userId, examId, draftJson, updatedAt]);
  }

  async getExamDraft(userId: number, examId: string): Promise<string | null> {
    const rows = await this.q<{ draft: string }>(
      'SELECT draft FROM exam_drafts WHERE user_id = $1 AND exam_id = $2', [userId, examId]);
    return rows[0] ? rows[0].draft : null;
  }

  async deleteExamDraft(userId: number, examId: string): Promise<void> {
    await this.q('DELETE FROM exam_drafts WHERE user_id = $1 AND exam_id = $2', [userId, examId]);
  }

  // ---- import ----

  async importAll(userId: number, data: ImportPayload): Promise<void> {
    await this.tx(async (query) => {
      for (const e of data.progress) {
        await query(`INSERT INTO progress (user_id, key, track, module, item_id, status, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (user_id, key) DO UPDATE SET status = EXCLUDED.status, updated_at = EXCLUDED.updated_at`,
          [userId, e.key, e.track, e.module, e.itemId, e.status, e.updatedAt]);
      }
      for (const a of data.quizAttempts) {
        await query(`INSERT INTO quiz_attempts (user_id, attempt_id, module, score, max_score, per_question, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT DO NOTHING`,
          [userId, a.attemptId, a.module, a.score, a.max, JSON.stringify(a.perQuestion), a.createdAt]);
      }
      for (const a of data.examAttempts) {
        await query(`INSERT INTO exam_attempts (user_id, attempt_id, exam_id, score, max_score, passed, score_pct, per_tag, responses, duration_sec, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          ON CONFLICT DO NOTHING`,
          [userId, a.attemptId, a.examId, a.score, a.max, a.passed, a.scorePct,
            JSON.stringify(a.perTag), JSON.stringify(a.responses), a.durationSec, a.createdAt]);
      }
      for (const { cardId, state } of data.cardStates) {
        await query(`INSERT INTO card_states (user_id, card_id, ease, interval_days, due_at, reps, lapses, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT (user_id, card_id) DO UPDATE SET
            ease = EXCLUDED.ease, interval_days = EXCLUDED.interval_days, due_at = EXCLUDED.due_at,
            reps = EXCLUDED.reps, lapses = EXCLUDED.lapses, updated_at = EXCLUDED.updated_at`,
          [userId, cardId, state.ease, state.intervalDays, state.dueAt, state.reps, state.lapses,
            new Date().toISOString()]);
      }
    });
  }

  // ---- admin aggregates ----

  /**
   * The roster aggregate, ported without correlated subqueries: per-branch
   * GROUP BY subqueries LEFT JOINed onto users (pg-mem cannot resolve outer
   * references inside subqueries; real Postgres runs both forms identically).
   * Rounding of best_quiz_pct moved into `rosterFromRow` because pg-mem (and
   * real PG, for float inputs) has no single-arg ROUND — results match
   * SQLite's ROUND for percentage values.
   */
  async getRoster(): Promise<RosterRow[]> {
    const rows = await this.q<Record<string, unknown>>(`
      SELECT u.id, u.username, u.display_name, u.role, u.last_seen_at,
        COALESCE(q.n, 0) AS quiz_attempts,
        qb.best AS best_quiz_pct,
        COALESCE(e.n, 0) AS exam_attempts,
        e.best AS best_exam_pct,
        COALESCE(s.n, 0) AS cards_tracked,
        COALESCE(r.n, 0) AS cards_reviewed
      FROM users u
      LEFT JOIN (SELECT user_id, COUNT(*) AS n FROM quiz_attempts GROUP BY user_id) q ON q.user_id = u.id
      LEFT JOIN (SELECT user_id, MAX(100.0 * score / max_score) AS best FROM quiz_attempts WHERE max_score > 0 GROUP BY user_id) qb ON qb.user_id = u.id
      LEFT JOIN (SELECT user_id, COUNT(*) AS n, MAX(score_pct) AS best FROM exam_attempts GROUP BY user_id) e ON e.user_id = u.id
      LEFT JOIN (SELECT user_id, COUNT(*) AS n FROM card_states GROUP BY user_id) s ON s.user_id = u.id
      LEFT JOIN (SELECT user_id, COUNT(*) AS n FROM card_reviews GROUP BY user_id) r ON r.user_id = u.id
      ORDER BY u.username`);
    return rows.map(rosterFromRow);
  }
}

function userFromPg(row: UserDbRow): UserRow {
  return {
    id: Number(row.id),
    username: row.username,
    displayName: row.display_name,
    passwordHash: row.password_hash,
    role: row.role as Role,
    createdAt: row.created_at,
    lastSeenAt: row.last_seen_at,
    identityId: row.identity_id,
    email: row.email,
    authProvider: row.auth_provider,
  };
}

/**
 * Production pool wiring: Dana injects PGHOST/PGPORT/PGDATABASE/PGUSER and
 * expects IAM-token auth (the metadata access token IS the password). The
 * function-password hook runs per connection attempt; failed connections
 * invalidate the cached token so the next attempt mints a fresh one.
 */
export function createPgPool(env: NodeJS.ProcessEnv = process.env): { pool: PgPoolLike; invalidateToken: () => void } {
  const host = env.PGHOST;
  if (!host) throw new Error('createPgPool requires PGHOST');
  const iam = createIamTokenProvider();
  const pool = new pg.Pool({
    host,
    port: env.PGPORT ? Number(env.PGPORT) : 5432,
    database: env.PGDATABASE,
    user: env.PGUSER,
    password: iam.password,
  });
  // Pool-level errors (broken idle connections) also drop the token cache.
  pool.on('error', () => iam.invalidate());
  return { pool: pool as PgPoolLike, invalidateToken: iam.invalidate };
}
