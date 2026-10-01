/**
 * Sweet'Oh loading mark: three layered ocean waves drifting at different speeds.
 * Pure CSS (see globals.css), honors prefers-reduced-motion, safe in server components.
 */
export function WaveLoader({ label, compact = false }: { label?: string; compact?: boolean }) {
  const wave = "M0 18 Q 15 6 30 18 T 60 18 T 90 18 T 120 18 T 150 18 T 180 18 T 210 18 T 240 18";
  return (
    <div className={`so-wave-loader${compact ? " so-wave-compact" : ""}`} role="status" aria-live="polite">
      <div className="so-wave-sea" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <svg key={i} className={`so-wave so-wave-${i}`} viewBox="0 0 240 36" preserveAspectRatio="none">
            <path d={wave} fill="none" stroke="currentColor" strokeWidth={i === 0 ? 2.2 : 1.6} strokeLinecap="round" />
          </svg>
        ))}
      </div>
      <span className="so-wave-label">{label ?? "Loading"}</span>
    </div>
  );
}
