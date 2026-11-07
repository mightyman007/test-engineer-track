import { useMemo, useState } from 'react';
import { mulberry32, scoreAttempt } from 'tet-core';
import type { Question } from 'tet-core';
import { useContent } from '../lib/content-context.js';
import { useSession } from '../state/session.js';

export function QuizRunner({ moduleId, size = 12 }: { moduleId: string; size?: number }) {
  const bundle = useContent();
  const { adapter } = useSession();

  const pool = useMemo(() => {
    const ids = bundle.questionsByModule[moduleId] ?? [];
    const qs = ids
      .map((id) => bundle.questions.find((q) => q.id === id))
      .filter((x): x is Question => Boolean(x));
    const rng = mulberry32(Date.now() % 2 ** 31);
    for (let i = qs.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [qs[i], qs[j]] = [qs[j]!, qs[i]!];
    }
    return qs.slice(0, size);
  }, [bundle, moduleId, size]);

  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<number[]>([]);
  const [answered, setAnswered] = useState(false);
  const [responses, setResponses] = useState<Record<string, number[]>>({});
  const [result, setResult] = useState<{ score: number; max: number } | null>(null);
  const [recorded, setRecorded] = useState(false);

  if (pool.length === 0) return <p className="muted">No questions yet for this module.</p>;
  const q = pool[idx]!;
  const lastOk = scoreAttempt([q], { [q.id]: selected }).score === 1;

  // Single choice grades the moment an option is picked; multi-select waits
  // for an explicit check so the learner can revise the selection first.
  function pick(optIdx: number) {
    if (answered) return;
    if (q.type === 'single') {
      setSelected([optIdx]);
      setAnswered(true);
      setResponses((r) => ({ ...r, [q.id]: [optIdx] }));
    } else {
      setSelected((s) => (s.includes(optIdx) ? s.filter((x) => x !== optIdx) : [...s, optIdx]));
    }
  }

  function checkAnswer() {
    if (answered || selected.length === 0) return;
    setAnswered(true);
    setResponses((r) => ({ ...r, [q.id]: selected }));
  }

  async function next() {
    if (idx + 1 < pool.length) {
      setIdx(idx + 1);
      setSelected([]);
      setAnswered(false);
    } else {
      const scored = scoreAttempt(pool, responses);
      setResult(scored);
      if (!recorded) {
        setRecorded(true);
        await adapter.recordQuizAttempt({
          attemptId: crypto.randomUUID(),
          module: moduleId, score: scored.score, max: scored.max,
          perQuestion: scored.perQuestion, createdAt: new Date().toISOString(),
        }).catch((err) => console.error('[tet] quiz attempt not recorded:', err));
      }
    }
  }

  if (result) {
    return (
      <div className="card">
        <h2>Score: {result.score} / {result.max}</h2>
        <p className="muted">Best attempts are kept; retakes are always available.</p>
        <button className="btn secondary" onClick={() => { setIdx(0); setSelected([]); setAnswered(false); setResponses({}); setResult(null); setRecorded(false); }}>
          Retake quiz
        </button>
      </div>
    );
  }

  return (
    <div className="card">
      <p className="muted">Question {idx + 1} of {pool.length}</p>
      <h3>{q.stem}</h3>
      {q.type === 'multi' && <p className="muted">Select all that apply.</p>}
      <div style={{ display: 'grid', gap: '0.5rem' }}>
        {q.type === 'single'
          ? q.options.map((opt, i) => (
              <button
                key={i}
                className="btn secondary"
                aria-pressed={selected.includes(i)}
                disabled={answered}
                style={{ justifyContent: 'flex-start', textAlign: 'left' }}
                onClick={() => pick(i)}
              >
                {opt}
              </button>
            ))
          : q.options.map((opt, i) => (
              <label key={i} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', padding: '0.5rem', border: '1px solid #e5e7eb', borderRadius: 8 }}>
                <input
                  type="checkbox"
                  name={`q-${q.id}`}
                  checked={selected.includes(i)}
                  disabled={answered}
                  onChange={() => pick(i)}
                />
                <span>{opt}</span>
              </label>
            ))}
      </div>
      {!answered
        ? q.type === 'multi' && (
            <p style={{ marginTop: '1rem' }}>
              <button className="btn" disabled={selected.length === 0} onClick={checkAnswer}>Check answer</button>
            </p>
          )
        : (
          <div>
            <p className={lastOk ? 'flag ok' : 'flag warn'}>{lastOk ? 'correct' : 'not quite'}</p>
            <p>{q.explanation}</p>
            <button className="btn" onClick={() => void next()}>Next</button>
          </div>
        )}
    </div>
  );
}
