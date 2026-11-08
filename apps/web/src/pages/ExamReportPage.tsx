import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { useContent } from '../lib/content-context.js';
import { useSession } from '../state/session.js';
import { ProgressBar } from '../components/ProgressBar.js';
import type { ExamAttempt } from 'tet-storage';

export function ExamReportPage() {
  const { examId, attemptId } = useParams();
  const bundle = useContent();
  const { adapter } = useSession();
  const [attempt, setAttempt] = useState<ExamAttempt | null>(null);

  const def = bundle.exams.find((e) => e.id === examId);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const all = await adapter.getExamAttempts(examId);
      if (alive) setAttempt(all.find((a) => a.attemptId === attemptId) ?? null);
    })();
    return () => { alive = false; };
  }, [adapter, examId, attemptId]);

  if (!def || !attempt) return <p className="muted">Report not found.</p>;

  const byId = new Map(bundle.questions.map((q) => [q.id, q]));

  return (
    <div>
      <h1>{def.title} — report</h1>
      <p className={attempt.passed ? 'flag ok' : 'flag warn'}>
        {attempt.score}/{attempt.max} · {Math.round(attempt.scorePct)}% · {attempt.passed ? 'PASS' : `fail — need ${def.passPct}%`}
      </p>
      <section className="card">
        <h2>By topic</h2>
        {Object.entries(attempt.perTag).map(([tag, v]) => (
          <p key={tag}>
            <strong>{tag}</strong> — {v.correct}/{v.total}
            <ProgressBar fraction={v.total ? v.correct / v.total : 0} />
          </p>
        ))}
      </section>
      <section className="card">
        <h2>Question review</h2>
        {Object.entries(attempt.responses).map(([qid, selected]) => {
          const q = byId.get(qid);
          if (!q) return null;
          const ok = selected.length === q.answers.length && [...selected].sort().join() === [...q.answers].sort().join();
          return (
            <div key={qid} style={{ borderBottom: '1px solid var(--border-soft)', paddingBottom: '0.75rem', marginBottom: '0.75rem' }}>
              <p><strong className={ok ? 'flag ok' : 'flag warn'}>{ok ? 'correct' : 'missed'}</strong> {q.stem}</p>
              <p className="muted">Your answer: {selected.map((i) => q.options[i]).join(', ') || '—'}</p>
              <p>Correct: {q.answers.map((i) => q.options[i]).join(', ')}</p>
              <p>{q.explanation}</p>
            </div>
          );
        })}
      </section>
      <p><Link className="btn secondary" to={`/exam/${def.id}`}>Retake exam</Link> <Link className="btn secondary" to="/">Dashboard</Link></p>
    </div>
  );
}
