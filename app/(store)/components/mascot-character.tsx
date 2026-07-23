/**
 * Sweet'Oh's mascot — a simple, friendly icon-level character (not a
 * detailed illustration), built from Sweet'Oh's own brand tokens so it reads
 * as on-brand from day one. Deliberately easy to swap for real character art
 * later: every consumer only ever renders <MascotCharacter />, never the SVG
 * markup directly, so replacing this with an <img> or a commissioned SVG
 * later touches exactly one file.
 */
export function MascotCharacter({
  size = 48,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={className}
      role="img"
      aria-label="Sweet'Oh AI"
    >
      {/* ears */}
      <circle cx="16" cy="16" r="9" fill="var(--so-gold)" />
      <circle cx="48" cy="16" r="9" fill="var(--so-gold)" />
      <circle cx="16" cy="16" r="4" fill="var(--so-cream)" />
      <circle cx="48" cy="16" r="4" fill="var(--so-cream)" />
      {/* head */}
      <circle cx="32" cy="34" r="24" fill="var(--so-gold)" />
      {/* muzzle */}
      <ellipse cx="32" cy="40" rx="12" ry="9" fill="var(--so-cream)" />
      {/* eyes */}
      <circle cx="24" cy="30" r="3" fill="var(--so-black)" />
      <circle cx="40" cy="30" r="3" fill="var(--so-black)" />
      {/* nose */}
      <ellipse cx="32" cy="37" rx="2.5" ry="2" fill="var(--so-black)" />
      {/* smile */}
      <path
        d="M32 39 Q32 44 26 43 M32 39 Q32 44 38 43"
        stroke="var(--so-black)"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}
