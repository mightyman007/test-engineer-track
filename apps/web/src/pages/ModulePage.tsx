import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { useContent } from '../lib/content-context.js';
import { useSession } from '../state/session.js';
import { ProgressBar } from '../components/ProgressBar.js';
import { ExamReadinessSection } from '../components/ExamReadinessSection.js';
import type { ExamAttempt } from 'tet-storage';

export function ModulePage() {
  const { moduleId } = useParams();
  const bundle = useContent();
  const { adapter } = useSession();
  const [progress, setProgress] = useState<Record<string, { status: string }>>({});
  const [bestQuiz, setBestQuiz] = useState<number | null>(null);
  const [examAttempts, setExamAttempts] = useState<ExamAttempt[]>([]);

  const found = moduleId
    ? bundle.tracks.flatMap((t) => t.modules.map((m) => ({ t, m }))).find((x) => x.m.id === moduleId)
    : null;

  useEffect(() => {
    void (async () => {
      setProgress(await adapter.getProgress());
      const attempts = await adapter.getQuizAttempts(moduleId ?? undefined);
      if (attempts.length > 0) {
        setBestQuiz(Math.max(...attempts.map((a) => a.max > 0 ? a.score / a.max : 0)));
      }
      setExamAttempts(await adapter.getExamAttempts());
    })();
  }, [adapter, moduleId]);

  if (!found) return <p className="muted">Module not found.</p>;
  const { t: track, m: mod } = found;
  const doneCount = mod.lessonIds.filter((lid) => progress[`${track.id}/${mod.id}/${lid}`]?.status === 'done').length;
  // The readiness hub: a module with no question pool of its own, on a track
  // that wires readiness exams, offers the mock-exam list + indicator instead
  // of a module quiz (module 8 is the shipped instance).
  const showReadiness = track.readiness.examIds.length > 0
    && (bundle.questionsByModule[mod.id] ?? []).length === 0;

  return (
    <div>
      <p className="muted"><Link to={`/track/${track.id}`}>{track.title}</Link></p>
      <h1>{mod.title}</h1>
      <ProgressBar fraction={mod.lessonIds.length ? doneCount / mod.lessonIds.length : 0} label={`${doneCount}/${mod.lessonIds.length} lessons`} />
      <section className="card">
        <h2>Lessons</h2>
        <ol>
          {mod.lessonIds.map((lid) => {
            const l = bundle.lessons[lid]!;
            const isDone = progress[`${track.id}/${mod.id}/${lid}`]?.status === 'done';
            return (
              <li key={lid}>
                <Link to={`/lesson/${lid}`}>{isDone ? '✓ ' : ''}{l.title}</Link>
                <span className="muted"> · {l.minutes} min</span>
              </li>
            );
          })}
        </ol>
      </section>
      {showReadiness
        ? <ExamReadinessSection track={track} attempts={examAttempts} />
        : (
            <section className="card">
              <h2>Practice</h2>
              <p><Link className="btn" to={`/quiz/${mod.id}`}>Module quiz</Link>{bestQuiz !== null && <span className="muted"> best {Math.round(bestQuiz * 100)}%</span>}</p>
              <p><Link className="btn secondary" to={`/flashcards/${mod.id}`}>Flashcards ({(bundle.cardsByModule[mod.id] ?? []).length} cards)</Link></p>
            </section>
          )}
    </div>
  );
}
