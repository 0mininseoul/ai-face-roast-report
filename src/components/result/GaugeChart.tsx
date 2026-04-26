export function GaugeChart({ label, value, comment }: { label: string; value: number; comment?: string }) {
  const v = Math.max(0, Math.min(100, value));
  const color = v < 30 ? "var(--accent-bad)" : v < 60 ? "var(--accent-warn)" : "var(--accent-info)";
  return (
    <div className="border-b border-border py-4 last:border-0">
      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-sm font-bold uppercase tracking-[0.08em] text-text-muted">{label}</span>
        <span className="text-3xl font-black tabular-nums text-text-primary">{Math.round(v)}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[var(--gauge-track)]">
        <div className="h-full rounded-full" style={{ width: `${v}%`, background: color }} />
      </div>
      {comment && <p className="mt-2 text-sm leading-6 text-text-muted">{comment}</p>}
    </div>
  );
}
