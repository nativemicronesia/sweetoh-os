import Link from "next/link";

export default function StudioPage() {
  return <section className="mx-auto max-w-2xl px-5 py-20">
    <p className="so-eyebrow">Something creative is growing</p>
    <h1 className="so-display mt-4 text-4xl">Your design studio is coming later.</h1>
    <p className="mt-5 so-muted">We're getting the shop ready first. In the meantime, explore pieces made by Sweet'Oh Creations.</p>
    <Link href="/collections" className="so-btn-primary mt-8">Explore the shop</Link>
  </section>;
}
