import { describe, expect, it } from 'vitest';
import { overallLessonProgress } from './progress.js';
import type { ContentBundle } from './types.js';

function bundle(): Pick<ContentBundle, 'tracks'> {
  return {
    tracks: [{
      id: 't1', title: 'T', description: 'D', order: 1,
      modules: [
        { id: 'm1', track: 't1', title: 'M1', order: 1, source: 'x', quizPool: 'x', deck: 'x', lessonIds: ['l1', 'l2'] },
        { id: 'm2', track: 't1', title: 'M2', order: 2, source: 'x', quizPool: 'x', deck: 'x', lessonIds: ['l3'] },
      ],
      readiness: { examIds: [], passPct: 65, readyPct: 80 },
    }],
  } as unknown as Pick<ContentBundle, 'tracks'>;
}

describe('overallLessonProgress', () => {
  it('counts done lessons across all modules', () => {
    const r = overallLessonProgress(bundle(), {
      't1/m1/l1': { status: 'done' },
      't1/m2/l3': { status: 'done' },
    });
    expect(r).toEqual({ done: 2, total: 3, pct: 200 / 3 });
  });

  it('is zero on an empty progress map and safe with no lessons', () => {
    expect(overallLessonProgress(bundle(), {})).toEqual({ done: 0, total: 3, pct: 0 });
    expect(overallLessonProgress({ tracks: [] }, {})).toEqual({ done: 0, total: 0, pct: 0 });
  });
});
