import { ContentBundleSchema, type ContentBundle } from 'tet-core';

let cached: ContentBundle | null = null;

export async function loadContent(): Promise<ContentBundle> {
  if (cached) return cached;
  const res = await fetch('content.json'); // relative: works under any base path
  if (!res.ok) throw new Error(`content.json fetch failed: ${res.status}`);
  cached = ContentBundleSchema.parse(await res.json()) as ContentBundle;
  // The cast bridges one known gap: Zod infers ExamDefinition.klevels as
  // Partial<Record<KLevel, number>> while the interface says Record — the
  // ledgered Task 1 deferral, to harden when exams gain real content (M3).
  return cached;
}

export function findModule(bundle: ContentBundle, moduleId: string) {
  for (const track of bundle.tracks) {
    const mod = track.modules.find((m) => m.id === moduleId);
    if (mod) return { track, module: mod };
  }
  return null;
}
