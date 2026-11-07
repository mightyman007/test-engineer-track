import type { CardState, Grade } from 'tet-core';

export interface ProgressEntry {
  track: string;
  module: string;
  itemId: string;
  status: 'done' | 'in-progress';
  updatedAt: string;
}
export type ProgressMap = Record<string, ProgressEntry>; // key `${track}/${module}/${itemId}`

export interface QuizAttempt {
  attemptId: string;
  module: string;
  score: number;
  max: number;
  perQuestion: Record<string, boolean>;
  createdAt: string;
}

export interface ExamAttempt {
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

export interface CardReview {
  cardId: string;
  grade: Grade;
  state: CardState;
  createdAt: string;
}

export interface SessionInfo {
  mode: 'solo' | 'cohort';
  userId: string;
  displayName: string;
  role: 'admin' | 'learner';
  serverUrl?: string;
}

export interface MigratableData {
  progress: ProgressMap;
  quizAttempts: QuizAttempt[];
  examAttempts: ExamAttempt[];
  cardStates: Record<string, CardState>;
}

export interface ExamDraft {
  examId: string;
  responses: Record<string, number[]>;
  flags: string[];
  startedAt: string;
  remainingSec: number;
  /**
   * Effective assembly rng seed (AssembledExam.seed) the exam was generated
   * with. Persisted so a resumed exam re-assembles the SAME question set and
   * restored responses map onto it. Optional: legacy drafts without it fall
   * back to a fresh draw (responses keyed by id still apply where questions
   * coincide).
   */
  seed?: number;
}

export interface StorageAdapter {
  getSession(): Promise<SessionInfo | null>;
  putSession(info: SessionInfo): Promise<void>;
  getProgress(): Promise<ProgressMap>;
  putProgress(entries: ProgressEntry[]): Promise<void>;
  recordQuizAttempt(a: QuizAttempt): Promise<void>;
  getQuizAttempts(moduleId?: string): Promise<QuizAttempt[]>;
  recordExamAttempt(a: ExamAttempt): Promise<void>;
  getExamAttempts(examId?: string): Promise<ExamAttempt[]>;
  recordCardReview(r: CardReview): Promise<void>;
  getReviewState(): Promise<Record<string, CardState>>;
  putExamDraft(d: ExamDraft): Promise<void>;
  getExamDraft(examId: string): Promise<ExamDraft | null>;
  clearExamDraft(examId: string): Promise<void>;
  exportAll(): Promise<MigratableData>;
  importAll(data: MigratableData): Promise<void>;
  /**
   * ServerAdapter only (optional): replay any buffered writes NOW, before the
   * next implicit drain — e.g. to flush pending writes while the session is
   * still valid, before an adapter is swapped or a logout kills the cookie.
   */
  drainPending?(): Promise<void>;
  /**
   * ServerAdapter only (optional): how many writes are currently buffered
   * awaiting replay (0 when nothing is pending). Callers decide whether
   * discarding an adapter would orphan data.
   */
  pendingWrites?(): number;
}
