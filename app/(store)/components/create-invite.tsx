import Link from "next/link";
export function CreateInvite() {
  return <section className="mx-auto max-w-6xl px-5 py-16 sm:px-8">
    <div className="rounded-3xl bg-[var(--so-dark)] px-6 py-12 sm:px-12">
      <p className="so-eyebrow">Made with a personal touch</p>
      <h2 className="so-display mt-4 text-3xl sm:text-5xl">A little island spirit.<br />Something for everyone.</h2>
      <p className="mt-5 max-w-xl so-muted">A Micronesian-owned creative print shop in Lacey, Washington. Apparel, gifts, and everyday pieces made to mean something.</p>
      <Link href="/collections" className="so-btn-primary mt-8">Explore collections</Link>
    </div>
  </section>;
}
