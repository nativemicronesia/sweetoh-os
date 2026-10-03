"use client";

import { useState, useTransition } from "react";
import { joinWaitlistAction } from "@/app/(creator-auth)/studio/actions";

/** Studio is not open to the public yet: take an email instead of turning people away. */
export function StudioList() {
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (done) {
    return (
      <p role="status" className="sx-card" style={{ padding: "1rem 1.2rem", background: "var(--sx-yellow)", maxWidth: "30rem", fontWeight: 600 }}>
        You&apos;re on the list. We&apos;ll email you the day Studio opens.
      </p>
    );
  }
  return (
    <form
      style={{ maxWidth: "30rem" }}
      onSubmit={(e) => {
        e.preventDefault();
        const form = new FormData(e.currentTarget);
        setError(null);
        start(async () => {
          const r = await joinWaitlistAction(form);
          if (r?.error) setError(r.error);
          else setDone(true);
        });
      }}
    >
      <label className="so-label" htmlFor="studio-list-email">Email me when Studio opens</label>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.7rem", marginTop: "0.4rem" }}>
        <input id="studio-list-email" className="so-input" style={{ flex: "1 1 14rem", marginTop: 0, width: "auto" }} name="email" type="email" required autoComplete="email" placeholder="you@example.com" />
        <button type="submit" className="so-btn-primary" disabled={pending}>{pending ? "Saving…" : "Join the list"}</button>
      </div>
      {error && <p role="alert" className="so-alert" style={{ marginTop: "0.7rem" }}>{error}</p>}
    </form>
  );
}
