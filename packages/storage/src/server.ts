import type { CardState } from 'tet-core';
import type {
  CardReview, ExamAttempt, ExamDraft, MigratableData, ProgressEntry,
  ProgressMap, QuizAttempt, SessionInfo, StorageAdapter,
} from './types.js';

/** A write that failed with 401, kept for replay in submission order. */
interface BufferedWrite {
  method: 'POST' | 'PUT' | 'DELETE';
  path: string;
  body: unknown;
}

class Unauthorized extends Error {}

/**
 * StorageAdapter backed by the REST server (cohort mode). Cookies travel via
 * `credentials: 'include'`. On a 401 the adapter calls `onUnauthorized()` once
 * (re-auth happens there), buffers the failed write, and replays the buffer —
 * in submission order — before the next request, so exam autosave survives
 * session expiry without losing data.
 */
export function createServerAdapter(opts: {
  serverUrl: string;
  fetchLike?: typeof fetch;
  onUnauthorized?: () => Promise<void>;
}): StorageAdapter {
  const base = opts.serverUrl.replace(/\/$/, '');
  const doFetch = opts.fetchLike ?? fetch.bind(globalThis);
  let buffer: BufferedWrite[] = [];
  let inflight: Promise<void> | null = null;

  async function call(path: string, init: RequestInit): Promise<Response> {
    const res = await doFetch(base + path, {
      ...init,
      credentials: 'include',
      headers: { 'content-type': 'application/json', ...(init.headers ?? {}) },
    });
    if (res.status === 401) {
      // Re-auth runs here, exactly once per 401 — catchers below never retry
      // within the same call, so repeated 401s cannot loop requests.
      if (opts.onUnauthorized) await opts.onUnauthorized();
      throw new Unauthorized();
    }
    return res;
  }

  /**
   * Replays buffered writes FIFO — single-flight: concurrent callers (e.g. the
   * four reads inside exportAll) await the same drain, so a buffered item is
   * sent exactly once, and the head leaves the buffer only after its send
   * succeeded.
   */
  function flush(): Promise<void> {
    inflight ??= (async () => {
      while (buffer.length > 0) {
        const item = buffer[0]!;
        try {
          await call(item.path, { method: item.method, body: item.body === undefined ? undefined : JSON.stringify(item.body) });
          buffer.shift();
        } catch (err) {
          if (!(err instanceof Unauthorized)) throw err;
          break; // still unauthorized; leave item at head for the next drain
        }
      }
    })().finally(() => { inflight = null; });
    return inflight;
  }

  /** Runs a write; on 401 it is buffered and replayed before the next request. */
  async function write(method: BufferedWrite['method'], path: string, body: unknown): Promise<void> {
    if (buffer.length > 0) {
      try {
        await flush(); // pending writes land first, then this one
      } catch {
        // Non-401 drain failure: the failed item is still buffered; fall
        // through and queue this write behind it rather than sending it fresh.
      }
    }
    if (buffer.length > 0) {
      // Drain incomplete (still unauthorized or target failing): queue behind
      // the pending writes so replay order stays submission order — a new
      // write must never leapfrog an older one to the same key.
      buffer.push({ method, path, body });
      return;
    }
    try {
      await call(path, { method, body: JSON.stringify(body) });
    } catch (err) {
      if (err instanceof Unauthorized) {
        buffer.push({ method, path, body }); // expired/offline: keep for replay, never throw during autosave
      } else {
        throw err;
      }
    }
  }

  async function getJson<T>(path: string, fallback: T): Promise<T> {
    if (buffer.length > 0) {
      try {
        await flush();
      } catch {
        // Reads stay available even when replay fails; the tail retries later.
      }
    }
    try {
      const res = await call(path, { method: 'GET' });
      return res.status === 204 ? fallback : await res.json() as T;
    } catch (err) {
      if (err instanceof Unauthorized) return fallback;
      throw err;
    }
  }

  return {
    async getSession(): Promise<SessionInfo | null> {
      if (buffer.length > 0) {
        try {
          await flush();
        } catch {
          // Reads stay available even when replay fails; the tail retries later.
        }
      }
      try {
        const res = await call('/api/me', { method: 'GET' });
        const body = await res.json() as { user: { id: number; username: string; displayName: string; role: 'admin' | 'learner' } };
        return {
          mode: 'cohort', userId: String(body.user.id),
          displayName: body.user.displayName, role: body.user.role, serverUrl: base,
        };
      } catch (err) {
        if (err instanceof Unauthorized) return null;
        throw err;
      }
    },
    async putSession() { /* cohort session state lives in cookies; nothing to store */ },
    async getProgress(): Promise<ProgressMap> { return getJson('/api/progress', {}); },
    async putProgress(entries: ProgressEntry[]) { await write('PUT', '/api/progress', { entries }); },
    async recordQuizAttempt(a: QuizAttempt) { await write('POST', '/api/attempts/quiz', a); },
    async getQuizAttempts(moduleId?: string): Promise<QuizAttempt[]> {
      return getJson(`/api/attempts/quiz${moduleId ? `?module=${encodeURIComponent(moduleId)}` : ''}`, []);
    },
    async recordExamAttempt(a: ExamAttempt) { await write('POST', '/api/attempts/exam', a); },
    async getExamAttempts(examId?: string): Promise<ExamAttempt[]> {
      return getJson(`/api/attempts/exam${examId ? `?examId=${encodeURIComponent(examId)}` : ''}`, []);
    },
    async recordCardReview(r: CardReview) { await write('POST', '/api/reviews', r); },
    async getReviewState(): Promise<Record<string, CardState>> {
      return getJson('/api/reviews', {});
    },
    async putExamDraft(d: ExamDraft) { await write('PUT', `/api/exam-draft/${encodeURIComponent(d.examId)}`, d); },
    async getExamDraft(examId: string): Promise<ExamDraft | null> {
      return getJson<ExamDraft | null>(`/api/exam-draft/${encodeURIComponent(examId)}`, null);
    },
    async clearExamDraft(examId: string) {
      await write('DELETE', `/api/exam-draft/${encodeURIComponent(examId)}`, undefined);
    },
    async exportAll(): Promise<MigratableData> {
      const [progress, quizAttempts, examAttempts, cardStates] = await Promise.all([
        this.getProgress(), this.getQuizAttempts(), this.getExamAttempts(), this.getReviewState(),
      ]);
      return { progress, quizAttempts, examAttempts, cardStates };
    },
    async importAll(data: MigratableData) { await write('POST', '/api/import', data); },
  };
}
