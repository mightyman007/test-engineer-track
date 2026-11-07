import type { AssembledExam, ExamDefinition, KLevel, Question } from './types.js';

export class AssemblyError extends Error {
  constructor(message: string) { super(message); this.name = 'AssemblyError'; }
}

/** Small, fast, seedable PRNG — sufficient for shuffling. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffled<T>(items: T[], rng: () => number): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
  return arr;
}

/**
 * Assemble an exam matching def exactly: per-group counts, K-level quotas,
 * and the multi-select cap. Deterministic for a given seed; tries 50 retry
 * seeds decorrelated by a golden-ratio stride (0x9E3779B1), which prevents
 * adjacent starting seeds from converging onto the same retry stream, before
 * giving up. Question order is shuffled; option order is preserved
 * (ISTQB options may include order-sensitive phrasings).
 */
export function assembleExam(
  def: ExamDefinition,
  pool: Question[],
  seed: number,
): AssembledExam {
  const kQuota = def.klevels ? ({ ...def.klevels } as Record<KLevel, number>) : null;
  let lastReason = 'unknown';
  for (let attempt = 0; attempt < 50; attempt++) {
    const rngSeed = (seed + attempt * 0x9E3779B1) >>> 0;
    const rng = mulberry32(rngSeed);
    const picked: Question[] = [];
    const used = new Set<string>();
    const kLeft = kQuota ? { ...kQuota } : null;
    let multiUsed = 0;
    let feasible = true;

    // Draw groups largest-first so scarce groups pick their fitting questions early.
    const groups = [...def.groups].sort((a, b) => b.count - a.count);
    for (const g of groups) {
      const candidates = pool.filter(
        (q) => !used.has(q.id) && q.tags.includes(g.tag) && !picked.includes(q),
      );
      const chosen = drawGroup(candidates, g.count, kLeft, def.multiSelectMax, () => multiUsed, rng);
      if (!chosen) { feasible = false; lastReason = `group ${g.tag} could not draw ${g.count}`; break; }
      for (const q of chosen) {
        used.add(q.id);
        picked.push(q);
        if (q.type === 'multi') multiUsed++;
      }
    }
    if (!feasible) continue;
    if (kLeft && Object.values(kLeft).some((v) => v !== 0)) {
      lastReason = `klevel quotas unmet: ${JSON.stringify(kLeft)}`;
      continue;
    }
    return {
      examId: def.id,
      questions: shuffled(picked, rng),
      timeLimitMin: def.timeLimitMin,
      passPct: def.passPct,
      total: def.total,
      seed: rngSeed,
    };
  }
  throw new AssemblyError(
    `cannot assemble exam "${def.id}" from bank of ${pool.length}: ${lastReason}`,
  );
}

/**
 * Pick `count` questions from candidates, respecting remaining K quotas
 * (when set — decremented as picks happen) and the global multi-select cap.
 * Candidates are bucketed by quota-urgency rank (open quota first), each
 * bucket shuffled; the checks below still enforce the hard constraints
 * regardless of order.
 */
function drawGroup(
  candidates: Question[],
  count: number,
  kLeft: Record<KLevel, number> | null,
  multiSelectMax: number,
  multiUsed: () => number,
  rng: () => number,
): Question[] | null {
  if (candidates.length < count) return null;

  const byRank = new Map<number, Question[]>();
  for (const q of candidates) {
    const r = rank(q);
    const list = byRank.get(r) ?? [];
    list.push(q);
    byRank.set(r, list);
  }
  const ordered = [...byRank.keys()].sort((a, b) => a - b)
    .flatMap((r) => shuffled(byRank.get(r)!, rng));

  const picked: Question[] = [];
  for (const q of ordered) {
    if (picked.length === count) break;
    if (q.type === 'multi' && multiUsed() + 1 > multiSelectMax) continue;
    if (kLeft && q.klevel && kLeft[q.klevel] !== undefined) {
      if (kLeft[q.klevel] <= 0) continue;
      kLeft[q.klevel] -= 1; // decrement as we pick so quota is enforced within the group
    }
    picked.push(q);
  }
  return picked.length === count ? picked : null;

  /** Sort key: questions with a K-level quota still open come first. */
  function rank(q: Question): number {
    if (!kLeft || !q.klevel || kLeft[q.klevel] === undefined) return 2;
    return kLeft[q.klevel] > 0 ? 0 : 1;
  }
}
