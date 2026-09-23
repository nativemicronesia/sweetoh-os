import Link from "next/link";

const IDEAS = ["Family reunion shirts", "Team & church events", "Your logo on tumblers", "Names & dates on gifts", "Your own artwork"];

/** Home page entry to custom requests — made-for-you pieces, answered by the shop by email. */
export function CustomOrdersBand() {
  return (
    <section className="mx-auto max-w-6xl px-5 pt-16 sm:px-8">
      <div className="grid items-center gap-8 rounded-3xl border px-6 py-10 sm:px-10 md:grid-cols-[1.2fr_1fr]" style={{ borderColor: "var(--so-border)", background: "var(--so-dark)" }}>
        <div>
          <p className="so-eyebrow">Custom orders</p>
          <h2 className="so-display mt-4 text-3xl sm:text-4xl">Something made just for you.</h2>
          <p className="mt-5 max-w-md so-muted">
            Your design, names, a logo, or shirts for the whole family reunion. Send the shop a request with a photo or two — they&apos;ll email you back. Nothing is made or charged until you agree.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/custom" className="so-btn-primary">Request a custom order</Link>
          </div>
        </div>
        <ul className="flex flex-wrap gap-2 md:justify-end">
          {IDEAS.map((idea) => (
            <li key={idea} className="rounded-full border px-4 py-2 text-sm so-muted" style={{ borderColor: "var(--so-border)" }}>{idea}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
