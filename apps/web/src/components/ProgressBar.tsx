export function ProgressBar({ fraction, label }: { fraction: number; label?: string }) {
  const pct = Math.round(Math.max(0, Math.min(1, fraction)) * 100);
  return (
    <div>
      <div className="bar"><div style={{ width: `${pct}%` }} /></div>
      {label && <span className="muted" style={{ fontSize: '0.85rem' }}> {label} · {pct}%</span>}
    </div>
  );
}
