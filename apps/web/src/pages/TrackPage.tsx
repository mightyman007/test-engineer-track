import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { useContent } from '../lib/content-context.js';
import { useSession } from '../state/session.js';
import { ProgressBar } from '../components/ProgressBar.js';
import { readinessVerdict } from '../lib/readiness.js';
import type { ExamAttempt } from 'tet-storage';

export function TrackPage() {
  const { trackId } = useParams();
  const bundle = useContent();
  const { adapter } = useSession();
  const [progress, setProgress] = useState<Record<string, { status: string }>>({});
  const [examAttempts, setExamAttempts] = useState<ExamAttempt[]>([]);

  const track = bundle.tracks.find((t) => t.id === trackId);

  useEffect(() => {
    void adapter.getProgress().then(setProgress);
    void adapter.getExamAttempts().then(setExamAttempts);
  }, [adapter]);

  if (!track) return <p className="muted">Track not found.</p>;

  const moduleDone = (mid: string, lessonIds: string[]) =>
    lessonIds.every((lid) => progress[`${track.id}/${mid}/${lid}`]?.status === 'done');

  // Data-driven readiness line (spec §5): "Ready" / the last-2 average / the
  // placeholder for tracks whose readiness exams are not wired yet.
  const readiness = readinessVerdict(track.readiness.examIds, track.readiness.readyPct, examAttempts);
  const readinessLine = readiness.state === 'no-exams'
    ? 'mock exams arrive with milestone 3'
    : readiness.state === 'ready'
      ? 'Ready'
      // Target surfaced from track data so a 65% learner knows the goal.
      : readiness.state === 'not-ready'
        ? `last 2 average ${readiness.lastTwoAvgPct}% · ready at ${track.readiness.readyPct}%`
        : 'take 2 mock exams for a reading';

  return (
    <div>
      <h1>{track.title}</h1>
      <p className="muted">{track.description}</p>
      {track.modules.map((m, i) => (
        <section className="card" key={m.id}>
          <h3><Link to={`/module/${m.id}`}>{i + 1}. {m.title}</Link></h3>
          <ProgressBar
            fraction={m.lessonIds.length
              ? m.lessonIds.filter((lid) => progress[`${track.id}/${m.id}/${lid}`]?.status === 'done').length / m.lessonIds.length
              : 0}
            label={moduleDone(m.id, m.lessonIds) ? 'complete' : `${m.lessonIds.length} lessons`}
          />
        </section>
      ))}
      <p className="muted">Readiness: {readinessLine}</p>
    </div>
  );
}
