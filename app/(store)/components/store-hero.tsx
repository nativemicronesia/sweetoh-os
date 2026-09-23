import Link from "next/link";

type HeroTile = { imageUrl: string | null; label: string; href: string };

type StoreHeroProps = {
  /** Up to three featured products; empty tiles fall back to island color blocks. */
  tiles: HeroTile[];
};

const FALLBACK_TILES = [
  { label: "Tees", href: "/collections/apparel", bg: "var(--so-lagoon)", ink: "rgba(255,255,255,.16)" },
  { label: "Tumblers", href: "/collections/drinkware", bg: "var(--so-coral)", ink: "rgba(255,255,255,.18)" },
  { label: "Little ones", href: "/collections/kids", bg: "var(--so-frangipani)", ink: "rgba(36,29,20,.12)" },
] as const;

const TILE_LAYOUT = [
  "left-0 top-4 w-[50%] -rotate-[5deg] z-10",
  "right-0 top-0 w-[46%] rotate-[4deg] z-20",
  "left-[27%] bottom-0 w-[44%] rotate-[-1.5deg] z-30",
] as const;

export function StoreHero({ tiles }: StoreHeroProps) {
  return (
    <section className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen">
      <div className="so-hero-wash so-grain relative overflow-hidden">
        <div className="relative mx-auto grid w-full max-w-6xl items-center gap-12 px-5 pb-16 pt-10 lg:min-h-[calc(100svh-6.1rem)] lg:pt-14 sm:px-8 lg:grid-cols-[1.3fr_1fr] lg:pb-20">
          <div>
            <p className="so-eyebrow so-animate-in">Sweet&apos;Oh Creations · Lacey, WA</p>
            <h1 className="so-display so-animate-in-delay mt-5 text-[clamp(2.7rem,6.6vw,5.4rem)] text-[color:var(--so-cream)]">
              Print the islands.
              <br />
              Wear the{" "}
              <span className="so-scribble">
                future
                <svg viewBox="0 0 300 24" preserveAspectRatio="none" aria-hidden>
                  <path d="M4 16 C 60 4, 120 22, 180 10 S 270 8, 296 14" fill="none" stroke="var(--so-hibiscus)" strokeWidth="7" strokeLinecap="round" />
                </svg>
              </span>
              .
            </h1>
            <p className="so-animate-in-delay-2 mt-7 max-w-md text-base leading-relaxed so-muted sm:text-lg">
              Micronesian-owned, made with care in Lacey, Washington. Creative apparel
              and gifts for every kind of person — or something made just for you.
            </p>
            <div className="so-animate-in-delay-2 mt-9 flex flex-wrap gap-3">
              <Link href="/collections" className="so-btn-primary">Shop the collection</Link>
              <Link href="/custom" className="so-btn-ghost">Request a custom order</Link>
            </div>
            <ul className="so-animate-in-delay-2 mt-10 flex flex-wrap gap-x-6 gap-y-2 text-sm so-muted">
              {["Made to order", "Micronesian-owned", "For every age"].map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <span aria-hidden style={{ color: "var(--so-hibiscus)" }}>✿</span>
                  {t}
                </li>
              ))}
            </ul>
          </div>

          {/* Collage */}
          <div className="relative mx-auto aspect-[1/0.95] w-full max-w-[34rem]" aria-label="Featured pieces">
            {TILE_LAYOUT.map((layout, i) => {
              const tile = tiles[i];
              const fallback = FALLBACK_TILES[i];
              return (
                <Link
                  key={layout}
                  href={tile?.href ?? fallback.href}
                  className={`so-lift absolute block overflow-hidden rounded-[1.4rem] bg-white p-2.5 shadow-[0_16px_40px_rgba(36,29,20,.16)] ${layout}`}
                >
                  {tile?.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={tile.imageUrl} alt={tile.label} className="aspect-[4/5] w-full rounded-[1rem] object-cover" />
                  ) : (
                    <div className="relative flex aspect-[4/5] w-full items-start overflow-hidden rounded-[1rem] p-4" style={{ background: fallback.bg }}>
                      <span className="so-pattern-layer" style={{ ["--pattern-ink" as string]: fallback.ink }} />
                      <span className="so-display relative text-2xl sm:text-3xl" style={{ color: i === 2 ? "var(--so-ink)" : "white" }}>
                        {fallback.label}
                      </span>
                    </div>
                  )}
                  {tile?.imageUrl ? <span className="block truncate px-1.5 pb-1 pt-2.5 text-xs font-medium so-muted">{tile.label}</span> : null}
                </Link>
              );
            })}
            <MadeToOrderSticker id="so-hero-sticker" className="absolute -left-3 bottom-8 z-40 h-28 w-28 sm:h-32 sm:w-32" />
          </div>
        </div>
      </div>
    </section>
  );
}

/** Round sticker with spinning text around a flower. */
export function MadeToOrderSticker({ className = "", id = "so-sticker" }: { className?: string; id?: string }) {
  return (
    <div className={className} aria-hidden>
      <svg viewBox="0 0 120 120" className="h-full w-full drop-shadow-[0_8px_18px_rgba(36,29,20,.22)]">
        <circle cx="60" cy="60" r="58" fill="var(--so-frangipani)" />
        <defs>
          <path id={`${id}-circle`} d="M60,60 m-44,0 a44,44 0 1,1 88,0 a44,44 0 1,1 -88,0" />
        </defs>
        <g className="so-sticker-spin">
          <text fontSize="8.6" fontWeight="700" letterSpacing="1.3" fill="var(--so-ink)" style={{ fontFamily: "var(--font-body)" }}>
            <textPath href={`#${id}-circle`}>MADE TO ORDER · MICRONESIAN-OWNED · </textPath>
          </text>
        </g>
        <g transform="translate(60 60) scale(0.85)" fill="var(--so-hibiscus)">
          {[0, 72, 144, 216, 288].map((r) => (
            <ellipse key={r} rx="6" ry="12" transform={`rotate(${r}) translate(0 -11)`} />
          ))}
          <circle r="4.5" fill="var(--so-frangipani)" />
        </g>
      </svg>
    </div>
  );
}
