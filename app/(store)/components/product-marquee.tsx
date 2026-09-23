const WORDS = ["Tees", "Hoodies", "Tumblers", "Totes", "Little ones", "Gifts", "Custom"];

/** Big outlined product-type words drifting across the page — the shop's shelf, at a glance. */
export function ProductMarquee() {
  const row = WORDS.map((w, i) => (
    <span key={w} className="flex items-center gap-10">
      <span className={`so-display text-[clamp(2.4rem,6vw,4.5rem)] leading-none ${i % 2 ? "so-outline" : "text-[color:var(--so-cream)]"}`}>{w}</span>
      <span aria-hidden className="text-3xl" style={{ color: i % 3 === 0 ? "var(--so-reef)" : i % 3 === 1 ? "var(--so-lagoon)" : "var(--so-coral)" }}>✦</span>
    </span>
  ));
  return (
    <section aria-label="What we make: tees, hoodies, tumblers, totes, kids, gifts and custom pieces" className="border-y py-7" style={{ borderColor: "var(--so-border)" }}>
      <div className="so-marquee">
        <div className="so-marquee-track" aria-hidden>{row}</div>
        <div className="so-marquee-track" aria-hidden>{row}</div>
      </div>
    </section>
  );
}
