import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { assembleExam, AssemblyError, scoreAttempt } from 'tet-core';
import type { Question } from 'tet-core';
import { useContent } from '../lib/content-context.js';
import { useSession } from '../state/session.js';

function fmt(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function ExamRunner() {
  const { examId } = useParams();
  const bundle = useContent();
  const { adapter } = useSession();
  const navigate = useNavigate();

  const def = bundle.exams.find((e) => e.id === examId);

  // `resumeSeed` is set from a restored draft so the SAME question set comes
  // back after a reload; without it (fresh exam or legacy draft) the assembly
  // draws a fresh time seed.
  const [resumeSeed, setResumeSeed] = useState<number | null>(null);

  // Assembly can fail at runtime (AssemblyError) when the shipped question
  // bank does not satisfy the exam definition — catch it and show a clear
  // error card instead of white-screening the whole page.
  const assembly = useMemo<{ ok: ReturnType<typeof assembleExam> | null; error: string | null }>(() => {
    if (!def || !examId) return { ok: null, error: null };
    try {
      return { ok: assembleExam(def, bundle.questions, resumeSeed ?? (Date.now() % 2 ** 31)), error: null };
    } catch (err) {
      if (!(err instanceof AssemblyError)) throw err;
      return { ok: null, error: err.message };
    }
  }, [def, bundle.questions, examId, resumeSeed]);
  const assembled = assembly.ok;

  const [responses, setResponses] = useState<Record<string, number[]>>({});
  const [flags, setFlags] = useState<Set<string>>(new Set());
  const [current, setCurrent] = useState(0);
  // Full clock from the first frame; the resume effect replaces it with the
  // draft's remaining time (or re-asserts the full time when none exists).
  const [remainingSec, setRemainingSec] = useState(() => (def ? def.timeLimitMin * 60 : 0));
  const [startedAt] = useState(() => new Date().toISOString());
  const [submitted, setSubmitted] = useState(false);
  const [draftLoaded, setDraftLoaded] = useState(false);
  /** Set when the submit's server writes fail — banner + retry, draft intact. */
  const [submitError, setSubmitError] = useState<string | null>(null);
  // The expiry auto-submit fires once per exam view even if it FAILS: a
  // failing submit at zero must not re-trigger itself in a tight loop (the
  // learner retries manually via the submit button).
  const autoSubmitFiredRef = useRef(false);

  const responsesRef = useRef(responses);
  responsesRef.current = responses;
  const flagsRef = useRef(flags);
  flagsRef.current = flags;
  const remainingRef = useRef(remainingSec);
  remainingRef.current = remainingSec;
  // Sync mirrors for callbacks that must not depend on effect timing
  // (interval saves, expiry auto-submit).
  const submittedRef = useRef(submitted);
  submittedRef.current = submitted;
  const draftLoadedRef = useRef(draftLoaded);
  draftLoadedRef.current = draftLoaded;
  // The effective assembly seed (AssembledExam.seed records the rng seed the
  // successful assembly actually ran with, including any retry stride), so a
  // resumed session reproduces the exact question set.
  const seedRef = useRef<number | null>(null);
  seedRef.current = assembled?.seed ?? null;

  // Draft resume: restore responses/flags/remaining time if a draft exists,
  // else start the full clock. `draftLoaded` flips true in BOTH cases — it
  // gates the expiry auto-submit so a zero-time submit can never fire before
  // the draft is restored.
  useEffect(() => {
    if (!def || !examId || !assembled) return;
    let alive = true;
    void (async () => {
      try {
        const draft = await adapter.getExamDraft(examId);
        if (!alive) return;
        if (draft) {
          // Re-assemble from the draft's seed FIRST (same flush), so the
          // restored responses map onto the resumed question set.
          if (draft.seed !== undefined) setResumeSeed(draft.seed);
          setResponses(draft.responses);
          setFlags(new Set(draft.flags));
          setRemainingSec(draft.remainingSec);
        } else {
          setRemainingSec(def.timeLimitMin * 60);
        }
      } catch {
        // Unreadable draft: keep the fresh clock rather than blocking the exam.
      } finally {
        if (alive) {
          draftLoadedRef.current = true;
          setDraftLoaded(true);
        }
      }
    })();
    return () => { alive = false; };
  }, [adapter, def, examId, assembled]);

  // Countdown + autosave (every 15 s and on unload). Never writes once the
  // exam is submitted — a stale save must not resurrect a cleared draft —
  // and never before the draft state has been read.
  useEffect(() => {
    if (!examId || remainingSec === 0) return;
    const tick = setInterval(() => {
      setRemainingSec((s) => Math.max(0, s - 1));
    }, 1000);
    const saveDraft = () => {
      if (submittedRef.current || !draftLoadedRef.current) return;
      void adapter.putExamDraft({
        examId, responses: responsesRef.current, flags: [...flagsRef.current],
        startedAt, remainingSec: remainingRef.current,
        seed: seedRef.current ?? undefined,
      });
    };
    const save = setInterval(saveDraft, 15_000);
    window.addEventListener('pagehide', saveDraft);
    return () => {
      clearInterval(tick);
      clearInterval(save);
      window.removeEventListener('pagehide', saveDraft);
    };
  }, [adapter, examId, startedAt, remainingSec === 0]);

  async function submit(auto = false) {
    if (submittedRef.current || !examId || !def || !assembled) return;
    submittedRef.current = true;
    setSubmitted(true);
    setSubmitError(null);
    const qs = assembled.questions;
    // Project responses onto the assembled exam (answered ones only): the
    // attempt stays self-consistent even if a restored draft's ids drifted
    // from the re-assembled set, so reports can't render phantom rows.
    const projected: Record<string, number[]> = {};
    for (const question of qs) {
      const r = responsesRef.current[question.id] ?? [];
      if (r.length > 0) projected[question.id] = r;
    }
    const scored = scoreAttempt(qs, projected);
    const perTag: Record<string, { correct: number; total: number }> = {};
    for (const question of qs) {
      for (const tag of question.tags) {
        const cell = (perTag[tag] ??= { correct: 0, total: 0 });
        cell.total += 1;
        if (scored.perQuestion[question.id]) cell.correct += 1;
      }
    }
    const scorePct = (100 * scored.score) / Math.max(1, scored.max);
    const attemptId = crypto.randomUUID();
    try {
      await adapter.recordExamAttempt({
        attemptId, examId, score: scored.score, max: scored.max,
        passed: scored.score >= Math.ceil((def.passPct / 100) * scored.max),
        scorePct, perTag, responses: projected,
        createdAt: new Date().toISOString(),
        durationSec: def.timeLimitMin * 60 - remainingRef.current,
      });
      await adapter.clearExamDraft(examId);
    } catch (err) {
      // Submit failed server-side: keep the draft (answers survive), unblock
      // the submit button, and surface the failure — never a silent loss.
      submittedRef.current = false;
      setSubmitted(false);
      setSubmitError(err instanceof Error ? err.message : String(err));
      return;
    }
    void auto;
    navigate(`/exam/${examId}/report/${attemptId}`);
  }

  // Auto-submit at zero — only after the draft resume has completed, and only
  // once even if that submit fails (the guard keeps a failing write from
  // looping; the learner retries manually).
  useEffect(() => {
    if (remainingSec === 0 && draftLoaded && !submitted && !autoSubmitFiredRef.current) {
      autoSubmitFiredRef.current = true;
      void submit(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remainingSec, submitted, draftLoaded]);

  if (!def) return <p className="muted">Exam not found.</p>;

  if (assembly.error) {
    return (
      <div className="card" role="alert" style={{ padding: '1rem 1.25rem' }}>
        <h2>Exam cannot be shown</h2>
        <p>
          This exam could not be assembled from the current question bank — run{' '}
          <code>pnpm --filter tet-content build</code> and check the exam definition.
        </p>
        <p className="muted" style={{ fontSize: '0.85rem' }}>{assembly.error}</p>
      </div>
    );
  }

  if (!assembled) return <p className="muted">Exam not found.</p>;

  const qs: Question[] = assembled.questions;

  function setResponse(qid: string, next: number[]) {
    setResponses((r) => ({ ...r, [qid]: next }));
  }

  function toggleFlag(qid: string) {
    setFlags((f) => {
      const n = new Set(f);
      if (n.has(qid)) n.delete(qid); else n.add(qid);
      return n;
    });
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <h1>{def.title}</h1>
        <h2 style={{ fontVariantNumeric: 'tabular-nums' }}>{fmt(remainingSec)}</h2>
      </div>
      <p className="muted">{qs.length} questions · pass at {def.passPct}% · answers save automatically</p>

      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', margin: '1rem 0' }} role="navigation" aria-label="Question navigation">
        {qs.map((question, i) => {
          const answered = (responses[question.id] ?? []).length > 0;
          const flagged = flags.has(question.id);
          return (
            <button
              key={question.id}
              onClick={() => {
                setCurrent(i);
                const el = document.getElementById(`exam-q-${i}`);
                if (typeof el?.scrollIntoView === 'function') el.scrollIntoView({ block: 'center' });
              }}
              aria-label={`Go to question ${i + 1}`}
              aria-current={i === current}
              style={{
                width: 36, height: 36, borderRadius: 6, cursor: 'pointer',
                border: i === current ? '2px solid var(--accent, #4f46e5)' : '1px solid #cbd5e1',
                background: flagged ? '#fef3c7' : answered ? '#dcfce7' : '#fff',
              }}
            >
              {i + 1}
            </button>
          );
        })}
      </div>

      {qs.map((question, i) => {
        const selected = responses[question.id] ?? [];
        const flagged = flags.has(question.id);
        return (
          <section className="card" key={question.id} id={`exam-q-${i}`} style={{ marginBottom: '1rem', outline: i === current ? '2px solid var(--accent, #4f46e5)' : 'none' }}>
            <p className="muted">Question {i + 1} of {qs.length}</p>
            <h3>{question.stem}</h3>
            {question.type === 'multi' && <p className="muted">Select {question.answers.length}.</p>}
            <div style={{ display: 'grid', gap: '0.5rem' }}>
              {question.type === 'single'
                ? question.options.map((opt, oi) => (
                    <button
                      key={oi}
                      className="btn secondary"
                      aria-pressed={selected.includes(oi)}
                      style={{ justifyContent: 'flex-start', textAlign: 'left' }}
                      onClick={() => setResponse(question.id, [oi])}
                    >
                      {opt}
                    </button>
                  ))
                : question.options.map((opt, oi) => (
                    <label key={oi} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', padding: '0.5rem', border: '1px solid #e5e7eb', borderRadius: 8 }}>
                      <input
                        type="checkbox"
                        name={`q-${question.id}`}
                        checked={selected.includes(oi)}
                        onChange={() => setResponse(
                          question.id,
                          selected.includes(oi) ? selected.filter((x) => x !== oi) : [...selected, oi],
                        )}
                      />
                      <span>{opt}</span>
                    </label>
                  ))}
            </div>
            <p style={{ marginTop: '1rem' }}>
              <button className="btn secondary" onClick={() => toggleFlag(question.id)}>
                {flagged ? '★ flagged' : 'flag for review'}
              </button>
            </p>
          </section>
        );
      })}

      {submitError && (
        <p role="alert" className="flag" style={{ borderColor: '#b91c1c', color: '#b91c1c', margin: '1rem 0' }}>
          submit failed — your answers are preserved; try again ({submitError})
        </p>
      )}
      <button className="btn" onClick={() => void submit(false)}>Submit exam</button>
    </div>
  );
}
