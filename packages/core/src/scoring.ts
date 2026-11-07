export function isReady(
  attempts: { scorePct: number }[],
  readyPct: number,
  minAttempts = 2,
): boolean {
  if (attempts.length < minAttempts) return false;
  const last = attempts.slice(-minAttempts);
  const mean = last.reduce((n, a) => n + a.scorePct, 0) / last.length;
  return mean >= readyPct;
}

export function trackCompletion(moduleIds: string[], done: Set<string>): number {
  if (moduleIds.length === 0) return 0;
  return moduleIds.filter((id) => done.has(id)).length / moduleIds.length;
}
