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
  // Per-video "I've watched this" acknowledgements, keyed by video url. Only
  // read when the lesson declares mandatoryVideos.
  const [watched, setWatched] = useState<Record<string, boolean>>({});

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

  // Acknowledgements belong to one lesson; navigating to the next lesson must
  // not inherit them (two lessons could embed the same video url).
  useEffect(() => {
    setWatched({});
  }, [lesson?.id]);

  if (!lesson || !trackMod) return <p className="muted">Lesson not found.</p>;
  const { t: track, m: mod } = trackMod;
  const idx = mod.lessonIds.indexOf(lesson.id);
  const nextId = mod.lessonIds[idx + 1];
  // A lesson may declare an interactive demo (frontmatter `demo = "<name>"`);
  // it renders below the body. Unknown names render nothing — the demos
  // registry is the source of truth for what exists.
  const Demo = lesson.demo ? LESSON_DEMOS[lesson.demo] : undefined;
  // Onboarding lessons (videosFirst) embed the Watch section ABOVE the body —
  // "watch these before you read on". mandatoryVideos gates crediting the
  // lesson complete on acknowledging every embedded video; navigation itself
  // is never blocked (the platform stays guided-but-unlocked).
  const mandatory = lesson.mandatoryVideos ?? false;
  const allWatched = lesson.videos.every((v) => watched[v.url]);
  const videos = lesson.videos.map((v) => (
    <div key={v.url}>
      <VideoEmbed url={v.url} title={v.title} />
      {mandatory && (
        <label>
          <input
            type="checkbox"
            checked={watched[v.url] ?? false}
            onChange={() => setWatched((w) => ({ ...w, [v.url]: !w[v.url] }))}
            aria-label={`I've watched ${v.title}`}
          />
          {' '}I've watched this video
        </label>
      )}
    </div>
  ));

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
      <TtsPlayer key={lesson.id} text={stripMarkdownForTts(lesson.body)} />
      {lesson.objectives.length > 0 && (
        <p className="muted">Objectives: {lesson.objectives.join(', ')}</p>
      )}
      {lesson.videosFirst && (
        <>
          <h2>Watch these first</h2>
          {videos}
        </>
      )}
      {renderMarkdown(lesson.body, { diagrams: bundle.diagrams })}
      {!lesson.videosFirst && (
        <>
          <h2>Watch</h2>
          {videos}
        </>
      )}
      {Demo && <Demo />}
      <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
        {done
          ? <span className="flag ok">complete</span>
          : (
            <>
              <button className="btn" onClick={markComplete} disabled={mandatory && !allWatched}>Mark lesson complete</button>
              {mandatory && !allWatched && (
                <span className="muted">Watch every video{lesson.videos.length > 1 ? 's' : ''} above and check each one to mark this lesson complete.</span>
              )}
            </>
          )}
        {nextId && <Link className="btn secondary" to={`/lesson/${nextId}`}>Next lesson →</Link>}
        {idx === mod.lessonIds.length - 1 && <Link className="btn secondary" to={`/quiz/${mod.id}`}>Take the module quiz →</Link>}
      </div>
    </article>
  );
}
