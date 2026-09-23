import Link from "next/link";
import { MadeToOrderSticker } from "./store-hero";

/** Who's behind the shop — a lagoon-colored patch between the shelves. */
export function BrandStory() {
  return (
    <section className="mx-auto w-full max-w-6xl px-5 sm:px-8">
      <div className="so-stitch relative overflow-hidden rounded-[2rem] px-7 py-14 sm:px-14 sm:py-20" style={{ background: "var(--so-lagoon)", color: "#f6f1e4" }}>
        <span className="so-pattern-layer" style={{ ["--pattern-ink" as string]: "rgba(255,255,255,.08)" }} />
        <div className="relative grid items-center gap-10 md:grid-cols-[1.4fr_1fr]">
          <div>
            <p className="so-eyebrow" style={{ color: "var(--so-frangipani)" }}>Our story</p>
            <h2 className="so-display mt-4 text-4xl sm:text-5xl" style={{ color: "white" }}>
              Island roots.
              <br />
              <em className="font-normal">Pressed in Lacey.</em>
            </h2>
            <p className="mt-6 max-w-lg text-base leading-relaxed sm:text-lg" style={{ color: "#dcebe6" }}>
              Sweet&apos;Oh Creations is a Micronesian-owned print shop in Lacey, Washington. We make creative apparel and
              gifts for every kind of person — and every piece is printed to order, so nothing sits on a shelf.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="/collections" className="inline-flex items-center justify-center px-7 py-3.5 text-sm font-semibold" style={{ background: "var(--so-frangipani)", color: "var(--so-ink)" }}>
                Shop the collection
              </Link>
              <Link href="/custom" className="inline-flex items-center justify-center border px-7 py-3.5 text-sm font-medium" style={{ borderColor: "rgba(246,241,228,.45)", color: "#f6f1e4" }}>
                Make something custom
              </Link>
            </div>
          </div>
          <div className="relative mx-auto hidden h-56 w-56 md:block">
            <MadeToOrderSticker id="so-story-sticker" className="h-full w-full" />
          </div>
        </div>
      </div>
    </section>
  );
}
