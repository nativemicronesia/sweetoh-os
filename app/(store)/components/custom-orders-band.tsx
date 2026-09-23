import Link from "next/link";

const IDEAS = ["Family reunion shirts", "Team & church events", "Your logo on tumblers", "Names & dates on gifts", "Your own artwork"];

/** Home page entry to custom requests — made-for-you pieces, answered by the shop by email. */
export function CustomOrdersBand() {
  return (
    <section className="mx-auto max-w-6xl px-5 sm:px-8">
      <div className="so-stitch relative grid items-center gap-8 overflow-hidden rounded-[2rem] px-7 py-12 sm:px-12 md:grid-cols-[1.2fr_1fr]" style={{ background: "var(--so-sand)" }}>
        <span className="so-pattern-layer" style={{ ["--pattern-ink" as string]: "rgba(36,29,20,.06)" }} />
        <div className="relative">
          <p className="so-eyebrow">Custom orders</p>
          <h2 className="so-display mt-4 text-4xl sm:text-5xl">Something made <em className="font-normal" style={{ color: "var(--so-hibiscus)" }}>just for you</em>.</h2>
          <p className="mt-5 max-w-md so-muted">
            Your design, names, a logo, or shirts for the whole family reunion. Send the shop a request with a photo or two — they&apos;ll email you back. Nothing is made or charged until you agree.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/custom" className="so-btn-primary">Request a custom order</Link>
          </div>
        </div>
        <ul className="relative flex flex-wrap gap-2 md:justify-end">
          {IDEAS.map((idea) => (
            <li key={idea} className="rounded-full bg-white px-4 py-2 text-sm text-[color:var(--so-cream)] shadow-sm">{idea}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
