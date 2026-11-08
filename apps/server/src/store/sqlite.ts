import type { DB } from '../db.js';
import { InviteConsumedError } from './types.js';
import type {
  CardReviewInput, CreateUserInput, DataStore, ExamAttemptInput, ExamAttemptRow,
  ImportPayload, InviteRow, ProgressInput, ProgressRow, QuizAttemptInput, QuizAttemptRow,
  ReviewStateRow, RosterRow, Role, SessionAuthRow, UserRow,
} from './types.js';

/**
 * SQLite driver: the original better-sqlite3 queries, moved verbatim out of
 * the routes (M7). The wrapped DB is opened by `openDb` (schema + identity
 * columns), so local dev/self-host behavior is unchanged.
 */
export class SqliteStore implements DataStore {
  private readonly db: DB;

  constructor(db: DB) {
    this.db = db;
  }

  async close(): Promise<void> {
    this.db.close();
  }

  // ---- users ----

  async countUsers(): Promise<number> {
    const row = this.db.prepare('SELECT COUNT(*) AS n FROM users').get() as { n: number };
    return row.n;
  }

  async getUserById(id: number): Promise<UserRow | null> {
    const row = this.db.prepare('SELECT * FROM users WHERE id = ?').get(id) as Record<string, unknown> | undefined;
    return row ? userFromSqlite(row) : null;
  }

  async getUserByUsername(username: string): Promise<UserRow | null> {
    const row = this.db.prepare('SELECT * FROM users WHERE username = ?').get(username) as
      Record<string, unknown> | undefined;
    return row ? userFromSqlite(row) : null;
  }

  async getUserByIdentityId(identityId: string): Promise<UserRow | null> {
    const row = this.db.prepare('SELECT * FROM users WHERE identity_id = ?').get(identityId) as
      Record<string, unknown> | undefined;
    return row ? userFromSqlite(row) : null;
  }

  async createUser(input: CreateUserInput): Promise<number> {
    if (input.inviteCode) {
      // Invite decrement + user insert happen atomically, so a failed insert
      // never burns a use (register flow). The decrement is GUARDED on
      // uses_left > 0: a register that raced the route's pre-check cannot
      // take a use that is no longer there — 0 changed rows throws the typed
      // error and the transaction rolls back with no user row (uses_left
      // never goes negative).
      const inviteCode = input.inviteCode; // narrowed copy: closures reset property narrowing
      const tx = this.db.transaction(() => {
        const dec = this.db
          .prepare('UPDATE invites SET uses_left = uses_left - 1 WHERE code = ? AND uses_left > 0')
          .run(inviteCode);
        if (dec.changes === 0) throw new InviteConsumedError(inviteCode);
        const info = this.db.prepare(
          'INSERT INTO users (username, display_name, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?)',
        ).run(input.username, input.displayName, input.passwordHash, input.role, input.createdAt);
        return Number(info.lastInsertRowid);
      });
      return tx();
    }
    if (input.identity) {
      const info = this.db.prepare(
        'INSERT INTO users (username, display_name, password_hash, role, created_at, identity_id, email, auth_provider) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      ).run(
        input.username, input.displayName, input.passwordHash, input.role, input.createdAt,
        input.identity.identityId, input.identity.email, input.identity.authProvider,
      );
      return Number(info.lastInsertRowid);
    }
    const info = this.db.prepare(
      'INSERT INTO users (username, display_name, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?)',
    ).run(input.username, input.displayName, input.passwordHash, input.role, input.createdAt);
    return Number(info.lastInsertRowid);
  }

  async updateUserLogin(userId: number, lastSeenAt: string): Promise<void> {
    this.db.prepare('UPDATE users SET last_seen_at = ? WHERE id = ?').run(lastSeenAt, userId);
  }

  async updateUserSso(userId: number, displayName: string, email: string | null, lastSeenAt: string): Promise<void> {
    this.db.prepare(
      'UPDATE users SET display_name = ?, email = COALESCE(?, email), last_seen_at = ? WHERE id = ?',
    ).run(displayName, email, lastSeenAt, userId);
  }

  async updateUserPassword(userId: number, passwordHash: string): Promise<boolean> {
    const info = this.db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(passwordHash, userId);
    return info.changes > 0;
  }

  // ---- sessions ----

  async insertSession(input: { tokenHash: string; userId: number; expiresAt: string }): Promise<void> {
    this.db.prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)')
      .run(input.tokenHash, input.userId, input.expiresAt);
  }

  async getSessionByTokenHash(tokenHash: string): Promise<SessionAuthRow | null> {
    const row = this.db.prepare(`
      SELECT u.id, u.username, u.display_name, u.role, s.expires_at
      FROM sessions s JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = ?`).get(tokenHash) as
      { id: number; username: string; display_name: string; role: string; expires_at: string } | undefined;
    if (!row) return null;
    return { id: row.id, username: row.username, displayName: row.display_name, role: row.role as Role, expiresAt: row.expires_at };
  }

  async deleteSessionsForUser(userId: number): Promise<void> {
    this.db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId);
  }

  // ---- invites ----

  async createInvite(input: { code: string; createdBy: number; usesLeft: number; expiresAt: string | null }): Promise<void> {
    this.db.prepare('INSERT INTO invites (code, created_by, uses_left, expires_at) VALUES (?, ?, ?, ?)')
      .run(input.code, input.createdBy, input.usesLeft, input.expiresAt);
  }

  async listInvites(): Promise<InviteRow[]> {
    const rows = this.db.prepare('SELECT code, uses_left, expires_at, created_by FROM invites ORDER BY rowid DESC')
      .all() as Array<{ code: string; uses_left: number; expires_at: string | null; created_by: number }>;
    return rows.map((row) => ({
      code: row.code, usesLeft: row.uses_left, expiresAt: row.expires_at, createdBy: row.created_by,
    }));
  }

  async getInviteByCode(code: string): Promise<InviteRow | null> {
    const row = this.db.prepare('SELECT * FROM invites WHERE code = ?').get(code) as
      { code: string; uses_left: number; expires_at: string | null; created_by: number } | undefined;
    if (!row) return null;
    return { code: row.code, usesLeft: row.uses_left, expiresAt: row.expires_at, createdBy: row.created_by };
  }

  // ---- progress ----

  async getProgress(userId: number): Promise<ProgressRow[]> {
    const rows = this.db.prepare('SELECT key, track, module, item_id, status, updated_at FROM progress WHERE user_id = ?')
      .all(userId) as Array<{ key: string; track: string; module: string; item_id: string; status: string; updated_at: string }>;
    return rows.map((row) => ({
      key: row.key, track: row.track, module: row.module, itemId: row.item_id,
      status: row.status as ProgressInput['status'], updatedAt: row.updated_at,
    }));
  }

  async putProgress(userId: number, entries: ProgressInput[]): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT INTO progress (user_id, key, track, module, item_id, status, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT (user_id, key) DO UPDATE SET status = excluded.status, updated_at = excluded.updated_at`);
    const run = this.db.transaction(() => {
      for (const e of entries) {
        stmt.run(userId, e.key, e.track, e.module, e.itemId, e.status, e.updatedAt);
      }
    });
    run();
  }

  // ---- attempts ----

  async recordQuizAttempt(userId: number, attempt: QuizAttemptInput): Promise<boolean> {
    const info = this.db.prepare(`
      INSERT OR IGNORE INTO quiz_attempts (user_id, attempt_id, module, score, max_score, per_question, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)`)
      .run(userId, attempt.attemptId, attempt.module, attempt.score, attempt.max,
        JSON.stringify(attempt.perQuestion), attempt.createdAt);
    return info.changes > 0;
  }

  async getQuizAttempts(userId: number, moduleId?: string): Promise<QuizAttemptRow[]> {
    const rows = this.db.prepare(`
      SELECT attempt_id, module, score, max_score, per_question, created_at
      FROM quiz_attempts WHERE user_id = ? ${moduleId ? 'AND module = ?' : ''}
      ORDER BY created_at DESC`)
      .all(...(moduleId ? [userId, moduleId] : [userId])) as
      Array<{ attempt_id: string; module: string; score: number; max_score: number; per_question: string; created_at: string }>;
    return rows.map((row) => ({
      attemptId: row.attempt_id, module: row.module, score: row.score, max: row.max_score,
      perQuestion: JSON.parse(row.per_question) as Record<string, boolean>, createdAt: row.created_at,
    }));
  }

  async recordExamAttempt(userId: number, attempt: ExamAttemptInput): Promise<boolean> {
    const info = this.db.prepare(`
      INSERT OR IGNORE INTO exam_attempts
        (user_id, attempt_id, exam_id, score, max_score, passed, score_pct, per_tag, responses, duration_sec, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(userId, attempt.attemptId, attempt.examId, attempt.score, attempt.max, attempt.passed ? 1 : 0,
        attempt.scorePct, JSON.stringify(attempt.perTag), JSON.stringify(attempt.responses),
        attempt.durationSec, attempt.createdAt);
    return info.changes > 0;
  }

  async getExamAttempts(userId: number, examId?: string): Promise<ExamAttemptRow[]> {
    const rows = this.db.prepare(`
      SELECT attempt_id, exam_id, score, max_score, passed, score_pct, per_tag, responses, duration_sec, created_at
      FROM exam_attempts WHERE user_id = ? ${examId ? 'AND exam_id = ?' : ''}
      ORDER BY created_at DESC`)
      .all(...(examId ? [userId, examId] : [userId])) as
      Array<{ attempt_id: string; exam_id: string; score: number; max_score: number; passed: number; score_pct: number;
        per_tag: string; responses: string; duration_sec: number; created_at: string }>;
    return rows.map((row) => ({
      attemptId: row.attempt_id, examId: row.exam_id, score: row.score, max: row.max_score,
      passed: row.passed === 1, scorePct: row.score_pct,
      perTag: JSON.parse(row.per_tag) as Record<string, { correct: number; total: number }>,
      responses: JSON.parse(row.responses) as Record<string, number[]>,
      durationSec: row.duration_sec, createdAt: row.created_at,
    }));
  }

  // ---- reviews ----

  async recordCardReview(userId: number, review: CardReviewInput): Promise<void> {
    const tx = this.db.transaction(() => {
      this.db.prepare(`INSERT INTO card_reviews (user_id, card_id, grade, ease, interval_days, due_at, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)`)
        .run(userId, review.cardId, review.grade, review.state.ease, review.state.intervalDays,
          review.state.dueAt, review.createdAt);
      this.db.prepare(`INSERT INTO card_states (user_id, card_id, ease, interval_days, due_at, reps, lapses, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT (user_id, card_id) DO UPDATE SET
          ease = excluded.ease, interval_days = excluded.interval_days, due_at = excluded.due_at,
          reps = excluded.reps, lapses = excluded.lapses, updated_at = excluded.updated_at`)
        .run(userId, review.cardId, review.state.ease, review.state.intervalDays, review.state.dueAt,
          review.state.reps, review.state.lapses, review.createdAt);
    });
    tx();
  }

  async getReviewState(userId: number): Promise<ReviewStateRow[]> {
    const rows = this.db.prepare('SELECT card_id, ease, interval_days, due_at, reps, lapses FROM card_states WHERE user_id = ?')
      .all(userId) as Array<{ card_id: string; ease: number; interval_days: number; due_at: string; reps: number; lapses: number }>;
    return rows.map((row) => ({
      cardId: row.card_id, ease: row.ease, intervalDays: row.interval_days,
      dueAt: row.due_at, reps: row.reps, lapses: row.lapses,
    }));
  }

  // ---- exam drafts ----

  async putExamDraft(userId: number, examId: string, draftJson: string, updatedAt: string): Promise<void> {
    this.db.prepare(`INSERT INTO exam_drafts (user_id, exam_id, draft, updated_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT (user_id, exam_id) DO UPDATE SET draft = excluded.draft, updated_at = excluded.updated_at`)
      .run(userId, examId, draftJson, updatedAt);
  }

  async getExamDraft(userId: number, examId: string): Promise<string | null> {
    const row = this.db.prepare('SELECT draft FROM exam_drafts WHERE user_id = ? AND exam_id = ?')
      .get(userId, examId) as { draft: string } | undefined;
    return row ? row.draft : null;
  }

  async deleteExamDraft(userId: number, examId: string): Promise<void> {
    this.db.prepare('DELETE FROM exam_drafts WHERE user_id = ? AND exam_id = ?').run(userId, examId);
  }

  // ---- import ----

  async importAll(userId: number, data: ImportPayload): Promise<void> {
    const tx = this.db.transaction(() => {
      const putProgress = this.db.prepare(`INSERT INTO progress (user_id, key, track, module, item_id, status, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT (user_id, key) DO UPDATE SET status = excluded.status, updated_at = excluded.updated_at`);
      for (const e of data.progress) {
        putProgress.run(userId, e.key, e.track, e.module, e.itemId, e.status, e.updatedAt);
      }
      const putQuiz = this.db.prepare(`INSERT OR IGNORE INTO quiz_attempts (user_id, attempt_id, module, score, max_score, per_question, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)`);
      for (const a of data.quizAttempts) {
        putQuiz.run(userId, a.attemptId, a.module, a.score, a.max, JSON.stringify(a.perQuestion), a.createdAt);
      }
      const putExam = this.db.prepare(`INSERT OR IGNORE INTO exam_attempts (user_id, attempt_id, exam_id, score, max_score, passed, score_pct, per_tag, responses, duration_sec, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
      for (const a of data.examAttempts) {
        putExam.run(userId, a.attemptId, a.examId, a.score, a.max, a.passed ? 1 : 0, a.scorePct,
          JSON.stringify(a.perTag), JSON.stringify(a.responses), a.durationSec, a.createdAt);
      }
      const putState = this.db.prepare(`INSERT INTO card_states (user_id, card_id, ease, interval_days, due_at, reps, lapses, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT (user_id, card_id) DO UPDATE SET
          ease = excluded.ease, interval_days = excluded.interval_days, due_at = excluded.due_at,
          reps = excluded.reps, lapses = excluded.lapses, updated_at = excluded.updated_at`);
      for (const { cardId, state } of data.cardStates) {
        putState.run(userId, cardId, state.ease, state.intervalDays, state.dueAt, state.reps, state.lapses,
          new Date().toISOString());
      }
    });
    tx();
  }

  // ---- admin aggregates ----

  async getRoster(): Promise<RosterRow[]> {
    const rows = this.db.prepare(`
      SELECT u.id, u.username, u.display_name, u.role, u.last_seen_at,
        (SELECT COUNT(*) FROM quiz_attempts q WHERE q.user_id = u.id) AS quiz_attempts,
        (SELECT MAX(ROUND(100.0 * q.score / q.max_score)) FROM quiz_attempts q WHERE q.user_id = u.id AND q.max_score > 0) AS best_quiz_pct,
        (SELECT COUNT(*) FROM exam_attempts e WHERE e.user_id = u.id) AS exam_attempts,
        (SELECT MAX(e.score_pct) FROM exam_attempts e WHERE e.user_id = u.id) AS best_exam_pct,
        (SELECT COUNT(*) FROM card_states s WHERE s.user_id = u.id) AS cards_tracked,
        (SELECT COUNT(*) FROM card_reviews r WHERE r.user_id = u.id) AS cards_reviewed
      FROM users u ORDER BY u.username`).all() as Array<Record<string, unknown>>;
    return rows.map(rosterFromRow);
  }
}

function userFromSqlite(row: Record<string, unknown>): UserRow {
  return {
    id: Number(row.id),
    username: String(row.username),
    displayName: String(row.display_name),
    passwordHash: String(row.password_hash),
    role: row.role as Role,
    createdAt: String(row.created_at),
    lastSeenAt: row.last_seen_at === null || row.last_seen_at === undefined ? null : String(row.last_seen_at),
    identityId: row.identity_id === null || row.identity_id === undefined ? null : String(row.identity_id),
    email: row.email === null || row.email === undefined ? null : String(row.email),
    authProvider: row.auth_provider === null || row.auth_provider === undefined ? 'local' : String(row.auth_provider),
  };
}

/**
 * Shared roster-row normalization: counts may arrive as numbers (SQLite,
 * pg-mem) or int8 strings (real node-pg COUNT(*) → bigint), and bestQuizPct
 * is integer-valued (SQLite's SQL already ROUNDs; the PG driver rounds here).
 */
export function rosterFromRow(row: Record<string, unknown>): RosterRow {
  const pct = (v: unknown): number | null =>
    v === null || v === undefined ? null : Math.round(Number(v));
  return {
    id: Number(row.id),
    username: String(row.username),
    displayName: String(row.display_name),
    role: String(row.role),
    lastSeenAt: row.last_seen_at === null || row.last_seen_at === undefined ? null : String(row.last_seen_at),
    quizAttempts: Number(row.quiz_attempts ?? 0),
    bestQuizPct: pct(row.best_quiz_pct),
    examAttempts: Number(row.exam_attempts ?? 0),
    // NOT rounded — matches the original route output (best_exam_pct is a raw
    // percentage; only best_quiz_pct was rounded, inside the SQL).
    bestExamPct: row.best_exam_pct === null || row.best_exam_pct === undefined ? null : Number(row.best_exam_pct),
    cardsTracked: Number(row.cards_tracked ?? 0),
    cardsReviewed: Number(row.cards_reviewed ?? 0),
  };
}
