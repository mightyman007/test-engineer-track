import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { useContent } from '../lib/content-context.js';
import { useSession } from '../state/session.js';
import { trackCompletion } from 'tet-core';
import { ProgressBar } from '../components/ProgressBar.js';
import { readinessVerdict } from '../lib/readiness.js';

export function Dashboard() {
  const bundle = useContent();
  const { adapter } = useSession();
  const [state, setState] = useState<{
    progress: Record<string, { status: string }>;
    quizBest: Record<string, number>;
    examScores: { examId: string; scorePct: number; createdAt: string }[];
    dueCount: number;
  } | null>(null);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const progress = await adapter.getProgress();
      const quiz = await adapter.getQuizAttempts();
      const exams = await adapter.getExamAttempts();
      const states = await adapter.getReviewState();
      const now = Date.now();
      const dueCount = Object.values(states)
        .filter((s) => new Date(s.dueAt).getTime() <= now).length;
      const quizBest: Record<string, number> = {};
      for (const a of quiz) {
        quizBest[a.module] = Math.max(quizBest[a.module] ?? 0, a.max > 0 ? a.score / a.max : 0);
      }
      // examId is kept per attempt: the per-track readiness chip must filter
      // to the track's own readiness exams (foreign exams never leak in).
      if (alive) setState({
        progress, quizBest,
        examScores: exams.map((e) => ({ examId: e.examId, scorePct: e.scorePct, createdAt: e.createdAt })),
        dueCount,
      });
    })();
    return () => { alive = false; };
  }, [adapter]);

  if (!state) return <p className="muted">Loading…</p>;

  return (
    <div>
      <h1>Dashboard</h1>
      {bundle.tracks.map((track) => {
        const done = track.modules.filter((m) =>
          m.lessonIds.every((lid) => state.progress[`${track.id}/${m.id}/${lid}`]?.status === 'done')).length;
        const nextModule = track.modules.find((m) =>
          !m.lessonIds.every((lid) => state.progress[`${track.id}/${m.id}/${lid}`]?.status === 'done'));
        const bestQuiz = Math.max(0, ...track.modules.map((m) => state.quizBest[m.id] ?? 0));
        const readiness = readinessVerdict(track.readiness.examIds, track.readiness.readyPct, state.examScores);
        return (
          <section className="card" key={track.id}>
            <h2>{track.title}</h2>
            <ProgressBar fraction={trackCompletion(track.modules.map((m) => m.id), new Set(
              track.modules.filter((m) => m.lessonIds.every((lid) => state.progress[`${track.id}/${m.id}/${lid}`]?.status === 'done')).map((m) => m.id),
            ))} label={`${done}/${track.modules.length} modules`} />
            {nextModule
              ? <p><Link className="btn" to={`/module/${nextModule.id}`}>Continue: {nextModule.title}</Link></p>
              : <p className="flag ok">All modules complete — take a mock exam.</p>}
            {bestQuiz > 0 && <p className="muted">best quiz {Math.round(bestQuiz * 100)}%</p>}
            {state.examScores.length > 0 && (
              <p className="muted">last exam {Math.round(state.examScores[0]!.scorePct)}%</p>
            )}
            {/* Readiness chip (spec §5), compact: ready / last-2 average / the ask for 2 mocks. */}
            {readiness.state !== 'no-exams' && (
              <p>
                {readiness.state === 'ready' && <span className="flag ok">✓ Ready</span>}
                {readiness.state === 'not-ready' && (
                  // Target surfaced from track data so a 65% learner knows the goal.
                  <span className="flag warn">
                    {readiness.lastTwoAvgPct}% avg (last 2) · ready at {track.readiness.readyPct}%
                  </span>
                )}
                {readiness.state === 'no-attempts' && (
                  <span className="muted">take 2 mock exams for a readiness reading</span>
                )}
              </p>
            )}
          </section>
        );
      })}
      <section className="card">
        <h2>Review</h2>
        {state.dueCount === 0
          ? <p className="muted">no flashcards due — nice.</p>
          : <p><Link className="btn" to="/flashcards">{state.dueCount} flashcard{state.dueCount === 1 ? '' : 's'} due</Link></p>}
      </section>
    </div>
  );
}
