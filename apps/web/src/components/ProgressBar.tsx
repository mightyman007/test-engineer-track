export function ProgressBar({ fraction, label }: { fraction: number; label?: string }) {
  const pct = Math.round(Math.max(0, Math.min(1, fraction)) * 100);
  return (
    // The root is the accessible widget: role + accessible name + value range
    // + current value, so assistive tech reads what the bar measures (the
    // label, or the bare percent when unlabeled) without relying on the
    // visual bar width.
    <div role="progressbar" aria-label={label ?? `${pct}% complete`}
      aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
      <div className="bar"><div style={{ width: `${pct}%` }} /></div>
      {label && <span className="muted" style={{ fontSize: '0.85rem' }}> {label} · {pct}%</span>}
    </div>
  );
}
