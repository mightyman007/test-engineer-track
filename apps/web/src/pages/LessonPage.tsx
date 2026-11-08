import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { stripMarkdownForTts } from 'tet-core';
import { useContent } from '../lib/content-context.js';
import { useSession } from '../state/session.js';
import { renderMarkdown } from '../lib/markdown.js';
import { VideoEmbed } from '../components/VideoEmbed.js';
import { TtsPlayer } from '../components/TtsPlayer.js';
import { LESSON_DEMOS } from '../components/demos.js';

export function LessonPage() {
  const { lessonId } = useParams();
  const bundle = useContent();
  const { adapter } = useSession();
  const [done, setDone] = useState(false);

  const lesson = lessonId ? bundle.lessons[lessonId] : null;
  const trackMod = lesson
    ? bundle.tracks.flatMap((t) => t.modules.map((m) => ({ t, m }))).find((x) => x.m.id === lesson.module)
    : null;

  useEffect(() => {
    void (async () => {
      if (!lesson) return;
      const progress = await adapter.getProgress();
      const key = `${trackMod?.t.id}/${lesson.module}/${lesson.id}`;
      setDone(progress[key]?.status === 'done');
    })();
  }, [adapter, lesson, trackMod]);

  if (!lesson || !trackMod) return <p className="muted">Lesson not found.</p>;
  const { t: track, m: mod } = trackMod;
  const idx = mod.lessonIds.indexOf(lesson.id);
  const nextId = mod.lessonIds[idx + 1];
  // A lesson may declare an interactive demo (frontmatter `demo = "<name>"`);
  // it renders below the body. Unknown names render nothing — the demos
  // registry is the source of truth for what exists.
  const Demo = lesson.demo ? LESSON_DEMOS[lesson.demo] : undefined;

  async function markComplete() {
    if (!lesson) return;
    await adapter.putProgress([{ track: track.id, module: mod.id, itemId: lesson.id, status: 'done', updatedAt: new Date().toISOString() }])
      .catch((err) => console.error('[tet] lesson progress not saved:', err));
    setDone(true);
  }

  return (
    <article>
      <p className="muted"><Link to={`/module/${mod.id}`}>{mod.title}</Link> · lesson {idx + 1} of {mod.lessonIds.length} · ~{lesson.minutes} min</p>
      <h1>{lesson.title}</h1>
      <TtsPlayer text={stripMarkdownForTts(lesson.body)} />
      {lesson.objectives.length > 0 && (
        <p className="muted">Objectives: {lesson.objectives.join(', ')}</p>
      )}
      {renderMarkdown(lesson.body, { diagrams: bundle.diagrams })}
      {Demo && <Demo />}
      <h2>Watch</h2>
      {lesson.videos.map((v) => <VideoEmbed key={v.url} url={v.url} title={v.title} />)}
      <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
        {done
          ? <span className="flag ok">complete</span>
          : <button className="btn" onClick={markComplete}>Mark lesson complete</button>}
        {nextId && <Link className="btn secondary" to={`/lesson/${nextId}`}>Next lesson →</Link>}
        {idx === mod.lessonIds.length - 1 && <Link className="btn secondary" to={`/quiz/${mod.id}`}>Take the module quiz →</Link>}
      </div>
    </article>
  );
}
