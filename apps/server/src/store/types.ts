/**
 * Engine-agnostic storage contract (M7). One method per operation the routes
 * perform — SQL lives entirely in the drivers (SqliteStore for local
 * dev/self-host, PgStore for Dana's managed Postgres).
 *
 * Row objects are camelCase plain data: JSON columns arrive parsed, booleans
 * arrive as booleans, aggregates as numbers — routes never see engine quirks
 * (INTEGER booleans, lastInsertRowid, rowid ordering, int8 strings).
 */

export type Role = 'admin' | 'learner';

export interface UserRow {
  id: number;
  username: string;
  displayName: string;
  passwordHash: string;
  role: Role;
  createdAt: string;
  lastSeenAt: string | null;
  identityId: string | null;
  email: string | null;
  authProvider: string;
}

/** What `userFromCookie` needs: session expiry joined with its user. */
export interface SessionAuthRow {
  id: number;
  username: string;
  displayName: string;
  role: Role;
  expiresAt: string;
}

export interface InviteRow {
  code: string;
  usesLeft: number;
  expiresAt: string | null;
  createdBy: number;
}

export interface CreateUserInput {
  username: string;
  displayName: string;
  passwordHash: string;
  role: Role;
  createdAt: string;
  /** When set, one use is consumed from this invite atomically with the insert. */
  inviteCode?: string;
  /** SSO auto-provision (M6): identity columns written on insert. */
  identity?: { identityId: string; email: string | null; authProvider: string };
}

export interface CardState {
  ease: number;
  intervalDays: number;
  dueAt: string;
  reps: number;
  lapses: number;
}

export interface ProgressInput {
  key: string;
  track: string;
  module: string;
  itemId: string;
  status: 'done' | 'in-progress';
  updatedAt: string;
}

export type ProgressRow = ProgressInput;

export interface QuizAttemptInput {
  attemptId: string;
  module: string;
  score: number;
  max: number;
  perQuestion: Record<string, boolean>;
  createdAt: string;
}

export type QuizAttemptRow = QuizAttemptInput;

export interface ExamAttemptInput {
  attemptId: string;
  examId: string;
  score: number;
  max: number;
  passed: boolean;
  scorePct: number;
  perTag: Record<string, { correct: number; total: number }>;
  responses: Record<string, number[]>;
  createdAt: string;
  durationSec: number;
}

export type ExamAttemptRow = ExamAttemptInput;

export interface CardReviewInput {
  cardId: string;
  grade: string;
  state: CardState;
  createdAt: string;
}

export interface ReviewStateRow {
  cardId: string;
  ease: number;
  intervalDays: number;
  dueAt: string;
  reps: number;
  lapses: number;
}

/** Payload for the transactional cross-device import (`POST /api/import`). */
export interface ImportPayload {
  progress: ProgressInput[];
  quizAttempts: QuizAttemptInput[];
  examAttempts: ExamAttemptInput[];
  cardStates: Array<{ cardId: string; state: CardState }>;
}

/** Admin roster / CSV aggregate — plain row, numbers already normalized. */
export interface RosterRow {
  id: number;
  username: string;
  displayName: string;
  role: string;
  lastSeenAt: string | null;
  quizAttempts: number;
  bestQuizPct: number | null;
  examAttempts: number;
  bestExamPct: number | null;
  cardsTracked: number;
  cardsReviewed: number;
}

export interface DataStore {
  // users
  countUsers(): Promise<number>;
  getUserById(id: number): Promise<UserRow | null>;
  getUserByUsername(username: string): Promise<UserRow | null>;
  getUserByIdentityId(identityId: string): Promise<UserRow | null>;
  createUser(input: CreateUserInput): Promise<number>;
  updateUserLogin(userId: number, lastSeenAt: string): Promise<void>;
  /** SSO re-login: refresh display_name, COALESCE the email (null keeps it), touch last_seen. */
  updateUserSso(userId: number, displayName: string, email: string | null, lastSeenAt: string): Promise<void>;
  /** Returns false when no user has this id (drives the admin reset's 404). */
  updateUserPassword(userId: number, passwordHash: string): Promise<boolean>;

  // sessions
  insertSession(input: { tokenHash: string; userId: number; expiresAt: string }): Promise<void>;
  getSessionByTokenHash(tokenHash: string): Promise<SessionAuthRow | null>;
  deleteSessionsForUser(userId: number): Promise<void>;

  // invites
  createInvite(input: { code: string; createdBy: number; usesLeft: number; expiresAt: string | null }): Promise<void>;
  /** Newest first. */
  listInvites(): Promise<InviteRow[]>;
  getInviteByCode(code: string): Promise<InviteRow | null>;

  // progress
  getProgress(userId: number): Promise<ProgressRow[]>;
  putProgress(userId: number, entries: ProgressInput[]): Promise<void>;

  // attempts
  /** Returns false when the attempt id was already recorded (idempotent replay). */
  recordQuizAttempt(userId: number, attempt: QuizAttemptInput): Promise<boolean>;
  getQuizAttempts(userId: number, moduleId?: string): Promise<QuizAttemptRow[]>;
  recordExamAttempt(userId: number, attempt: ExamAttemptInput): Promise<boolean>;
  getExamAttempts(userId: number, examId?: string): Promise<ExamAttemptRow[]>;

  // reviews (audit row + state upsert happen atomically)
  recordCardReview(userId: number, review: CardReviewInput): Promise<void>;
  getReviewState(userId: number): Promise<ReviewStateRow[]>;

  // exam drafts (raw JSON string roundtrip)
  putExamDraft(userId: number, examId: string, draftJson: string, updatedAt: string): Promise<void>;
  getExamDraft(userId: number, examId: string): Promise<string | null>;
  deleteExamDraft(userId: number, examId: string): Promise<void>;

  // import (transactional)
  importAll(userId: number, data: ImportPayload): Promise<void>;

  // admin aggregates (roster + CSV share this)
  getRoster(): Promise<RosterRow[]>;

  /** Release engine resources (SQLite handle / PG pool). */
  close(): Promise<void>;
}
