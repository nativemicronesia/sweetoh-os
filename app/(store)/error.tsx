"use client";

import { useEffect } from "react";
import Link from "next/link";

/** Storefront safety net — never a blank page or a raw stack trace. */
export default function StoreError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("store_error", error.digest ?? error.message);
  }, [error]);

  return (
    <section className="mx-auto max-w-xl px-5 py-24 text-center">
      <p className="so-eyebrow">Something went sideways</p>
      <h1 className="so-display mt-4 text-3xl sm:text-4xl">This page didn&apos;t load</h1>
      <p className="mt-5 so-muted">It&apos;s us, not you. Try again, or head back to the shop.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <button type="button" onClick={reset} className="so-btn-primary">Try again</button>
        <Link href="/collections" className="so-btn-ghost">Shop the collections</Link>
        <Link href="/create" className="so-btn-ghost">Create with Sweet&apos;Oh</Link>
      </div>
    </section>
  );
}
