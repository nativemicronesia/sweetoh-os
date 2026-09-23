import Link from "next/link";
import { MascotCharacter } from "./mascot-character";
import { creatorSideOpen } from "@/lib/domains/creator/access";

/**
 * Two doors into the brand: Shop, and either Create with Sweet'Oh (once the
 * creator side opens) or Custom orders (launch).
 */
export function CreateInvite() {
  const creators = creatorSideOpen();
  return (
    <section className="mx-auto max-w-6xl px-5 py-16 sm:px-8">
      <div className="grid gap-5 md:grid-cols-2">
        <div className="rounded-3xl bg-[var(--so-dark)] px-6 py-12 sm:px-10">
          <p className="so-eyebrow">Shop with Sweet&apos;Oh</p>
          <h2 className="so-display mt-4 text-3xl sm:text-4xl">A little island spirit.<br />Something for everyone.</h2>
          <p className="mt-5 max-w-md so-muted">Apparel, gifts and everyday pieces from a Micronesian-owned print shop in Lacey, Washington.</p>
          <Link href="/collections" className="so-btn-primary mt-8">Explore collections</Link>
        </div>
        <div className="relative overflow-hidden rounded-3xl px-6 py-12 sm:px-10" style={{ background: "linear-gradient(140deg, #133f28, #2e8b4f)", color: "#eef8e9" }}>
          {creators ? (
            <>
              <p className="so-eyebrow" style={{ color: "#b9e46d" }}>Create with Sweet&apos;Oh</p>
              <h2 className="so-display mt-4 text-3xl sm:text-4xl" style={{ color: "white" }}>Start your own<br />print-on-demand brand.</h2>
              <p className="mt-5 max-w-md" style={{ color: "#cfe6c9" }}>Design real products in the Sweet&apos;Oh Studio, learn the business with Skink — our AI guide — and sell from your own store. Start free.</p>
              <Link href="/create" className="mt-8 inline-flex items-center justify-center px-7 py-3.5 text-sm font-semibold" style={{ background: "#b9e46d", color: "#133f28", borderRadius: 12 }}>Start creating →</Link>
            </>
          ) : (
            <>
              <p className="so-eyebrow" style={{ color: "#b9e46d" }}>Custom orders</p>
              <h2 className="so-display mt-4 text-3xl sm:text-4xl" style={{ color: "white" }}>Something made<br />just for you.</h2>
              <p className="mt-5 max-w-md" style={{ color: "#cfe6c9" }}>Your design, names, a logo, or shirts for the whole family reunion. Send the shop a request and they&apos;ll email you back — nothing is made until you agree.</p>
              <Link href="/custom" className="mt-8 inline-flex items-center justify-center px-7 py-3.5 text-sm font-semibold" style={{ background: "#b9e46d", color: "#133f28", borderRadius: 12 }}>Request a custom order →</Link>
            </>
          )}
          <MascotCharacter size={120} className="pointer-events-none absolute -bottom-4 right-2 opacity-90" />
        </div>
      </div>
    </section>
  );
}
