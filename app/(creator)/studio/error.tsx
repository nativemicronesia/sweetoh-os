"use client";

import { useEffect } from "react";
import Link from "next/link";
import { MessageCircle, RotateCw } from "lucide-react";
import { MascotCharacter } from "@/app/(store)/components/mascot-character";

/** Nothing in the Studio is ever a dead end: say what happened, offer the way out. */
export default function StudioError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("studio_error", error.digest ?? error.message);
  }, [error]);

  return (
    <div className="cs-empty" style={{ background: "white", maxWidth: 560, margin: "40px auto" }}>
      <MascotCharacter size={56} />
      <h3>That page didn&apos;t load</h3>
      <p className="cs-muted" style={{ margin: "0 auto 18px", maxWidth: 420 }}>
        Your designs and everything Skink remembers are safe. This was a hiccup on our side — try again, and if it keeps happening tell Skink and he&apos;ll point you somewhere useful.
      </p>
      <div className="cs-row" style={{ justifyContent: "center" }}>
        <button type="button" className="cs-btn cs-btn-primary" onClick={reset}>
          <RotateCw size={16} /> Try again
        </button>
        <Link href="/studio" className="cs-btn cs-btn-ghost">Back to Home</Link>
        <Link href="/studio/skink" className="cs-btn cs-btn-quiet"><MessageCircle size={16} /> Ask Skink</Link>
      </div>
    </div>
  );
}
