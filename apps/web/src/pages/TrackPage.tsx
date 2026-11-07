import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { useContent } from '../lib/content-context.js';
import { useSession } from '../state/session.js';
import { ProgressBar } from '../components/ProgressBar.js';

export function TrackPage() {
  const { trackId } = useParams();
  const bundle = useContent();
  const { adapter } = useSession();
  const [progress, setProgress] = useState<Record<string, { status: string }>>({});

  const track = bundle.tracks.find((t) => t.id === trackId);

  useEffect(() => {
    void adapter.getProgress().then(setProgress);
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
      <p className="muted">Readiness: {track.readiness.examIds.length === 0
        ? 'mock exams arrive with milestone 3'
        : `pass ≥ ${track.readiness.passPct}%, ready at ${track.readiness.readyPct}% average`}</p>
    </div>
  );
}
