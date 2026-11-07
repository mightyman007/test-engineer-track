import { openDB, type IDBPDatabase } from 'idb';
import type { CardState, Grade } from 'tet-core';
import type {
  CardReview, ExamAttempt, MigratableData, ProgressEntry, ProgressMap,
  QuizAttempt, SessionInfo, StorageAdapter,
} from './types.js';

const DB_NAME = 'tet';
const VERSION = 1;

interface Stores {
  kv: { key: string; value: unknown };
  progress: { key: string; value: ProgressEntry & { key: string } };
  quizAttempts: { key: string; value: QuizAttempt };
  examAttempts: { key: string; value: ExamAttempt };
  cardStates: { key: string; value: { cardId: string; state: CardState; updatedAt: string } };
  cardReviews: { key: number; value: CardReview };
}

function pkey(e: Omit<ProgressEntry, 'key'>): string {
  return `${e.track}/${e.module}/${e.itemId}`;
}

export function createLocalAdapter(): StorageAdapter {
  let dbPromise: Promise<IDBPDatabase<Stores>> | null = null;
  function db(): Promise<IDBPDatabase<Stores>> {
    dbPromise ??= openDB<Stores>(DB_NAME, VERSION, {
      upgrade(d) {
        d.createObjectStore('kv');
        d.createObjectStore('progress', { keyPath: 'key' });
        d.createObjectStore('quizAttempts', { keyPath: 'attemptId' });
        d.createObjectStore('examAttempts', { keyPath: 'attemptId' });
        d.createObjectStore('cardStates', { keyPath: 'cardId' });
        d.createObjectStore('cardReviews', { autoIncrement: true });
      },
    });
    return dbPromise;
  }

  return {
    async getSession() {
      const d = await db();
      return (await d.get('kv', 'session') as SessionInfo | undefined) ?? null;
    },
    async putSession(info) {
      const d = await db();
      await d.put('kv', info, 'session');
    },
    async getProgress() {
      const d = await db();
      const rows = await d.getAll('progress');
      const map: ProgressMap = {};
      for (const r of rows) {
        const { key, ...entry } = r;
        map[key] = entry;
      }
      return map;
    },
    async putProgress(entries) {
      const d = await db();
      const tx = d.transaction('progress', 'readwrite');
      for (const e of entries) {
        await tx.store.put({ ...e, key: pkey(e) });
      }
      await tx.done;
    },
    async recordQuizAttempt(a) {
      const d = await db();
      await d.put('quizAttempts', a);
    },
    async getQuizAttempts(moduleId) {
      const d = await db();
      const all = (await d.getAll('quizAttempts')).sort(
        (x, y) => y.createdAt.localeCompare(x.createdAt),
      );
      return moduleId ? all.filter((a) => a.module === moduleId) : all;
    },
    async recordExamAttempt(a) {
      const d = await db();
      await d.put('examAttempts', a);
    },
    async getExamAttempts(examId) {
      const d = await db();
      const all = (await d.getAll('examAttempts')).sort(
        (x, y) => y.createdAt.localeCompare(x.createdAt),
      );
      return examId ? all.filter((a) => a.examId === examId) : all;
    },
    async recordCardReview(r) {
      const d = await db();
      const tx = d.transaction(['cardReviews', 'cardStates'], 'readwrite');
      await tx.objectStore('cardReviews').add(r);
      await tx.objectStore('cardStates').put({
        cardId: r.cardId, state: r.state, updatedAt: r.createdAt,
      });
      await tx.done;
    },
    async getReviewState() {
      const d = await db();
      const rows = await d.getAll('cardStates');
      const out: Record<string, CardState> = {};
      for (const r of rows) out[r.cardId] = r.state;
      return out;
    },
    async exportAll(): Promise<MigratableData> {
      const d = await db();
      const states = await d.getAll('cardStates');
      const cardStates: Record<string, CardState> = {};
      for (const s of states) cardStates[s.cardId] = s.state;
      return {
        progress: await this.getProgress(),
        quizAttempts: await this.getQuizAttempts(),
        examAttempts: await this.getExamAttempts(),
        cardStates,
      };
    },
    async importAll(data) {
      await this.putProgress(Object.values(data.progress));
      for (const qa of data.quizAttempts) await this.recordQuizAttempt(qa);
      for (const ea of data.examAttempts) await this.recordExamAttempt(ea);
      const d = await db();
      const now = new Date().toISOString();
      for (const [cardId, state] of Object.entries(data.cardStates)) {
        await d.put('cardStates', { cardId, state, updatedAt: now });
      }
    },
  };
}
