"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { joinAction, studioSignInAction, type AuthState } from "./actions";

export function AuthForm({ mode, next, notice }: { mode: "join" | "login"; next?: string; notice?: string | null }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(mode === "join" ? joinAction : studioSignInAction, undefined);
  return (
    <form action={action} noValidate={false}>
      <h1 className="cs-h1" style={{ fontSize: 34 }}>{mode === "join" ? "Start creating — free" : "Welcome back"}</h1>
      <p className="cs-sub" style={{ marginBottom: 22 }}>
        {mode === "join" ? "Design real products, learn print-on-demand with Skink, and send them to your own store. No card needed." : "Sign in to your Sweet'Oh Studio."}
      </p>
      {notice && <p className="cs-note" style={{ marginBottom: 14 }}>{notice}</p>}
      {state?.error && <p className="cs-alert" role="alert" style={{ marginBottom: 14 }}>{state.error}</p>}
      <input type="hidden" name="next" value={next ?? "/studio"} />
      {mode === "join" && (
        <label className="cs-field">
          <span className="cs-label">Your name</span>
          <input className="cs-input" name="name" autoComplete="name" required maxLength={80} defaultValue={state?.name} placeholder="e.g. Maria Santos" />
        </label>
      )}
      <label className="cs-field">
        <span className="cs-label">Email</span>
        <input className="cs-input" name="email" type="email" autoComplete="email" required defaultValue={state?.email} placeholder="you@example.com" />
      </label>
      <label className="cs-field">
        <span className="cs-label">Password</span>
        <input className="cs-input" name="password" type="password" autoComplete={mode === "join" ? "new-password" : "current-password"} required minLength={mode === "join" ? 8 : 1} placeholder={mode === "join" ? "At least 8 characters" : ""} />
      </label>
      <button className="cs-btn cs-btn-primary cs-btn-lg" style={{ width: "100%", marginTop: 6 }} disabled={pending}>
        {pending && <Loader2 size={18} className="pe-spin" />}
        {mode === "join" ? "Create my free studio" : "Sign in"}
      </button>
      <p className="cs-muted" style={{ fontSize: 14, marginTop: 18, textAlign: "center" }}>
        {mode === "join" ? <>Already creating? <Link className="cs-link" href="/studio/login">Sign in</Link></> : <>New to Sweet&apos;Oh? <Link className="cs-link" href="/studio/join">Create a free account</Link></>}
      </p>
      {mode === "join" && <p className="cs-muted" style={{ fontSize: 12, marginTop: 10, textAlign: "center" }}>By joining you agree to the <Link href="/terms">Terms</Link> and <Link href="/privacy">Privacy policy</Link>.</p>}
    </form>
  );
}
