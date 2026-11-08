import { ContentBundleSchema, type ContentBundle } from 'tet-core';

let cached: ContentBundle | null = null;

export async function loadContent(): Promise<ContentBundle> {
  if (cached) return cached;
  let res: Response;
  try {
    res = await fetch('content.json'); // relative: works under any base path
  } catch (err) {
    // Network-level failure (offline, DNS) — same family as the non-ok
    // status below, so the UI message always names the stage that failed.
    throw new Error(`content.json fetch failed: ${(err as Error).message}`);
  }
  if (!res.ok) throw new Error(`content.json fetch failed: ${res.status}`);
  let raw: unknown;
  try {
    raw = await res.json();
  } catch (err) {
    throw new Error(`content.json parse failed: ${(err as Error).message}`);
  }
  const parsed = ContentBundleSchema.safeParse(raw);
  if (!parsed.success) {
    // Parse failures get their own wording: a 404 and a corrupt bundle are
    // different problems (refetch vs. broken build), and the error card
    // should let the operator tell them apart at a glance. Capped so a
    // corrupt bundle renders a readable message, not 200 Zod issues.
    const issues = parsed.error.issues
      .slice(0, 3)
      .map((i) => `${i.path.join('.')}: ${i.message}`)
      .join('; ');
    const extra = parsed.error.issues.length > 3
      ? ` (+${parsed.error.issues.length - 3} more)`
      : '';
    throw new Error(`content.json parse failed: ${issues}${extra}`);
  }
  cached = parsed.data as ContentBundle;
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
