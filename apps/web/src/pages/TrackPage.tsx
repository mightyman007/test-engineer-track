import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { useContent } from '../lib/content-context.js';
import { useSession } from '../state/session.js';
import { ProgressBar } from '../components/ProgressBar.js';
import { ExamReadinessSection } from '../components/ExamReadinessSection.js';
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
      {/* Readiness (spec §5): a track with wired mock exams renders the full
          hub — the exam entry links, the verdict, and the attempt history —
          right on the track page, so the mocks are one click from the track's
          home. The AI track has no empty-pool hub module (every AI module has
          a question pool), so this page is its ONLY exam entry point; before
          this section a learner finishing A8 saw "take 2 mock exams" with no
          way to take them. Tracks whose exams are not wired yet keep the
          placeholder line. */}
      {track.readiness.examIds.length > 0
        ? <ExamReadinessSection track={track} attempts={examAttempts} />
        : <p className="muted">Readiness: mock exams arrive with milestone 3</p>}
    </div>
  );
}
