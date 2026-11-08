import { Link } from 'react-router';
import { useContent } from '../lib/content-context.js';
import { TAKE_TWO_MOCKS, readinessVerdict } from '../lib/readiness.js';
import type { Track } from 'tet-core';
import type { ExamAttempt } from 'tet-storage';

/**
 * The exam-readiness hub section: the track's mock exams as entry links, the
 * readiness indicator (spec §5 — the last-2 average against readyPct), and
 * the recent attempt history when one exists.
 *
 * Pure props by design — the page that renders it owns the adapter and
 * fetches attempts, so tests drive every state without storage or network.
 */
export function ExamReadinessSection({ track, attempts }: {
  track: Track;
  attempts: ExamAttempt[];
}) {
  const bundle = useContent();
  const verdict = readinessVerdict(track.readiness.examIds, track.readiness.readyPct, attempts);
  const examTitle = (examId: string) => bundle.exams.find((e) => e.id === examId)?.title ?? examId;

  return (
    <section className="card">
      <h2>Take a mock exam</h2>
      {verdict.state === 'ready' && <p className="flag ok">Ready for the real exam</p>}
      {verdict.state === 'not-ready' && (
        // State the goal in the same breath as the shortfall — the target
        // comes from the track's data (readyPct), never hard-coded.
        <p className="flag warn">
          Not yet — last 2 average {verdict.lastTwoAvgPct}% · ready at {track.readiness.readyPct}%
        </p>
      )}
      {verdict.state === 'no-attempts' && (
        <p className="muted">{TAKE_TWO_MOCKS}</p>
      )}
      <ol>
        {track.readiness.examIds.map((id) => {
          const def = bundle.exams.find((e) => e.id === id);
          if (!def) return null;
          return (
            <li key={id}>
              <Link to={`/exam/${def.id}`}>{def.title}</Link>
              <span className="muted"> · {def.total} questions · {def.timeLimitMin} min</span>
            </li>
          );
        })}
      </ol>
      {verdict.trackAttempts.length > 0 && (
        <>
          <h3>Recent attempts</h3>
          <ul>
            {[...verdict.trackAttempts].slice(-5).reverse().map((a) => (
              <li key={a.attemptId}>
                <Link to={`/exam/${a.examId}/report/${a.attemptId}`}>{Math.round(a.scorePct)}%</Link>
                <span className="muted"> · {a.createdAt.slice(0, 10)} · {examTitle(a.examId)}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
