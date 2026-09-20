"use client";

import { useState, useTransition } from "react";
import { Check, Loader2 } from "lucide-react";
import { joinWaitlistAction } from "./actions";

/** Sign-ups aren't open yet — take an email instead of turning people away. */
export function Waitlist() {
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (done) {
    return (
      <div className="cs-note" role="status">
        <Check size={16} style={{ verticalAlign: -3 }} /> You&apos;re on the list. We&apos;ll email you the moment Sweet&apos;Oh AI opens for creators.
      </div>
    );
  }

  return (
    <form
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
      <h1 className="cs-h1" style={{ fontSize: 34 }}>Sweet&apos;Oh AI opens soon</h1>
      <p className="cs-sub" style={{ marginBottom: 22 }}>
        We&apos;re getting the shop ready first. Leave your email and you&apos;ll be among the first islanders in — free for 3 months when we open.
      </p>
      {error && <p className="cs-alert" role="alert" style={{ marginBottom: 14 }}>{error}</p>}
      <label className="cs-field">
        <span className="cs-label">Email</span>
        <input className="cs-input" name="email" type="email" required placeholder="you@example.com" autoComplete="email" />
      </label>
      <button className="cs-btn cs-btn-primary cs-btn-lg" style={{ width: "100%" }} disabled={pending}>
        {pending && <Loader2 size={18} className="pe-spin" />} Tell me when it opens
      </button>
      <p className="cs-muted" style={{ fontSize: 13, marginTop: 18, textAlign: "center" }}>
        Already have a creator account? <a className="cs-link" href="/studio/login">Sign in</a>
      </p>
    </form>
  );
}
