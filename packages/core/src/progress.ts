import type { ContentBundle } from './types.js';

export interface ProgressLike {
  status: string;
}

/**
 * Overall lesson completion across every track in the bundle:
 * counts a lesson done when its progress entry is 'done'.
 */
export function overallLessonProgress(
  bundle: Pick<ContentBundle, 'tracks'>,
  progress: Record<string, ProgressLike>,
): { done: number; total: number; pct: number } {
  let total = 0;
  let done = 0;
  for (const track of bundle.tracks) {
    for (const mod of track.modules) {
      for (const lid of mod.lessonIds) {
        total += 1;
        if (progress[`${track.id}/${mod.id}/${lid}`]?.status === 'done') done += 1;
      }
    }
  }
  return { done, total, pct: total > 0 ? (100 * done) / total : 0 };
}
