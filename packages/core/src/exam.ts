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
 *
 * K-level quotas come in two shapes (schema v2):
 * - Legacy (no group declares `klevels`): the definition-level `klevels`, if
 *   present, is ONE shared quota map decremented across all groups exactly as
 *   in M1 — a question picked by any group shrinks the quota left for the
 *   groups drawn after it.
 * - Per-group (every group declares `klevels`): each group draws against its
 *   OWN cells — a fresh quota map per group, with levels absent from the
 *   group's record treated as zero quota. A question counts against the cell
 *   matching its `klevel`; a klevel'd question whose cell is spent or absent
 *   in that group is skipped; a question with NO `klevel` is always eligible
 *   within a group and fills its count without touching cells (the group's
 *   cells must still reach zero via klevel'd questions, or the group fails).
 *   Per-group cells are authoritative: the definition-level `klevels`, if
 *   also present, is not consulted while drawing in this mode.
 * Mixed definitions (some groups with cells, some without) throw an
 * AssemblyError immediately: the schema enforces all-or-nothing and the
 * engine re-checks it for hand-built definitions, because blending
 * authoritative per-group cells with a shared global remainder has no
 * coherent quota semantics.
 * The multi-select cap stays global in both modes. A starved cell is named
 * in the failure reason, e.g. `group ch4 could not draw 5 K3`.
 */
export function assembleExam(
  def: ExamDefinition,
  pool: Question[],
  seed: number,
): AssembledExam {
  const withCells = def.groups.filter((g) => g.klevels !== undefined).length;
  const perGroup = def.groups.length > 0 && withCells === def.groups.length;
  if (withCells > 0 && !perGroup) {
    throw new AssemblyError(
      `exam "${def.id}" mixes per-group klevels: declare klevels on all groups or none`,
    );
  }
  const kQuota = perGroup
    ? null // per-group cells are authoritative; the global map is not consulted
    : def.klevels
      ? ({ ...def.klevels } as Record<KLevel, number>)
      : null;
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
      // Schema v2: a fresh per-group quota map per attempt; legacy: the shared
      // global remainder (possibly null when the definition declares no quota).
      const quota = perGroup ? normalizeCells(g.klevels!) : kLeft;
      const candidates = pool.filter(
        (q) => !used.has(q.id) && q.tags.includes(g.tag) && !picked.includes(q),
      );
      const chosen = drawGroup(candidates, g.count, quota, def.multiSelectMax, () => multiUsed, rng);
      const unmet = perGroup && quota ? unmetCell(quota) : null;
      if (!chosen || unmet) {
        // A per-group cell that did not reach zero is the actionable cause
        // (more precise than a bare count failure, which keeps the M1 reason).
        feasible = false;
        lastReason = unmet
          ? `group ${g.tag} could not draw ${unmet.remaining} ${unmet.level}`
          : `group ${g.tag} could not draw ${g.count}`;
        break;
      }
      for (const q of chosen) {
        used.add(q.id);
        picked.push(q);
        if (q.type === 'multi') multiUsed++;
      }
    }
    if (!feasible) continue;
    if (!perGroup && kLeft && Object.values(kLeft).some((v) => v !== 0)) {
      lastReason = `klevel quotas unmet: ${JSON.stringify(kLeft)}`;
      continue;
    }
    if (multiUsed > def.multiSelectMax) {
      lastReason = `multi-select cap exceeded: ${multiUsed} > ${def.multiSelectMax}`;
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
 * Fill levels absent from a per-group cells record with 0. An absent cell
 * means "no quota for that level" — a klevel'd question of that level is
 * skipped rather than drawn unconstrained (a normalized record makes
 * drawGroup enforce that without special-casing).
 */
function normalizeCells(cells: Record<KLevel, number>): Record<KLevel, number> {
  const out: Record<KLevel, number> = { K1: 0, K2: 0, K3: 0 };
  for (const level of ['K1', 'K2', 'K3'] as const) {
    const v = cells[level];
    if (typeof v === 'number' && Number.isFinite(v)) out[level] = v;
  }
  return out;
}

/** First cell (K1 → K2 → K3) that did not reach zero, for error naming. */
function unmetCell(quota: Record<KLevel, number>): { level: KLevel; remaining: number } | null {
  for (const level of ['K1', 'K2', 'K3'] as const) {
    if (quota[level] > 0) return { level, remaining: quota[level] };
  }
  return null;
}

/**
 * Pick `count` questions from candidates, respecting the quota map passed in
 * (the shared global remainder in legacy mode, the group's own K cells in
 * schema-v2 mode — decremented as picks happen) and the global multi-select
 * cap. Candidates are bucketed by quota-urgency rank (open quota first), each
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
