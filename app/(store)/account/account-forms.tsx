"use client";

import { useActionState, useState } from "react";
import { customerSignInAction, customerSignUpAction } from "./actions";

export function AccountForms({ initialMode, next }: { initialMode: "signup" | "login"; next: string }) {
  const [mode, setMode] = useState(initialMode);
  const [signUpState, signUp, signingUp] = useActionState(customerSignUpAction, undefined);
  const [signInState, signIn, signingIn] = useActionState(customerSignInAction, undefined);

  return (
    <div className="mt-8">
      <div className="mb-6 flex gap-2" role="tablist">
        {(["signup", "login"] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            onClick={() => setMode(m)}
            className={mode === m ? "so-btn-primary" : "so-btn-ghost"}
            style={{ padding: "0.6rem 1.2rem" }}
          >
            {m === "signup" ? "Create account" : "Sign in"}
          </button>
        ))}
      </div>

      {mode === "signup" ? (
        <form action={signUp} className="space-y-4">
          <input type="hidden" name="next" value={next} />
          <label className="so-label">
            Your name
            <input className="so-input" name="name" required maxLength={80} autoComplete="name" defaultValue={signUpState?.values?.name} />
          </label>
          <label className="so-label">
            Email
            <input className="so-input" type="email" name="email" required autoComplete="email" defaultValue={signUpState?.values?.email} placeholder="Use the email you order with" />
          </label>
          <label className="so-label">
            Password
            <input className="so-input" type="password" name="password" required minLength={8} autoComplete="new-password" placeholder="At least 8 characters" />
          </label>
          <label className="so-label">
            Phone <span className="so-muted">(optional)</span>
            <input className="so-input" type="tel" name="phone" maxLength={40} autoComplete="tel" defaultValue={signUpState?.values?.phone} />
          </label>
          {signUpState?.error && <p role="alert" className="so-alert">{signUpState.error}</p>}
          <button type="submit" className="so-btn-primary w-full" disabled={signingUp}>
            {signingUp ? "Creating your account…" : "Create my account"}
          </button>
        </form>
      ) : (
        <form action={signIn} className="space-y-4">
          <input type="hidden" name="next" value={next} />
          <label className="so-label">
            Email
            <input className="so-input" type="email" name="email" required autoComplete="email" defaultValue={signInState?.values?.email} />
          </label>
          <label className="so-label">
            Password
            <input className="so-input" type="password" name="password" required autoComplete="current-password" />
          </label>
          {signInState?.error && <p role="alert" className="so-alert">{signInState.error}</p>}
          <button type="submit" className="so-btn-primary w-full" disabled={signingIn}>
            {signingIn ? "Signing in…" : "Sign in"}
          </button>
        </form>
      )}
    </div>
  );
}
