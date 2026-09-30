"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";

export default function PartnerPageError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Partner workspace page failed to load", error);
  }, [error]);

  return (
    <section
      role="alert"
      className="pf-card mx-auto grid max-w-xl justify-items-start gap-4 p-6 sm:p-8"
      style={{ border: "1px solid var(--pf-border)", borderRadius: 20, background: "var(--pf-card)" }}
    >
      <span
        aria-hidden="true"
        className="grid h-11 w-11 place-items-center rounded-full"
        style={{ color: "#9a4c24", background: "#f9e8db" }}
      >
        <AlertTriangle size={21} />
      </span>
      <div>
        <h1 className="text-2xl font-semibold" style={{ color: "var(--pf-text)" }}>
          This page didn&apos;t load.
        </h1>
        <p className="mt-2 text-sm leading-6" style={{ color: "var(--pf-muted)" }}>
          Your workspace may be temporarily unavailable. Try loading this page again, or return to your home screen.
        </p>
      </div>
      <div className="flex flex-wrap gap-3">
        <button type="button" className="pf-btn pf-btn-primary" onClick={reset}>
          Try again
        </button>
        <Link className="pf-btn pf-btn-ghost" href="/partner">
          Go to home
        </Link>
      </div>
    </section>
  );
}
