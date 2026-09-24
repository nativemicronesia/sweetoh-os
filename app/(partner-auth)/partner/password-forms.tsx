"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  forgotPasswordAction,
  resetPasswordAction,
  type PasswordFormState,
} from "@/app/(partner)/partner/actions/auth";

export function ForgotForm() {
  const [state, action, pending] = useActionState<PasswordFormState, FormData>(forgotPasswordAction, null);
  if (state?.done) {
    return (
      <p className="login-note" role="status">
        If that email has a back office account, a reset link is on its way. Check your inbox (and spam) — the link works for an hour.
      </p>
    );
  }
  return (
    <form action={action} className="login-form">
      <label>
        <span>Email</span>
        <input type="email" name="email" required autoComplete="email" placeholder="you@example.com" />
      </label>
      <button type="submit" disabled={pending}>{pending ? "Sending…" : "Email me a reset link"}</button>
    </form>
  );
}

export function ResetForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState<PasswordFormState, FormData>(resetPasswordAction, null);
  return (
    <form action={action} className="login-form">
      <input type="hidden" name="token" value={token} />
      {state?.error && (
        <p role="alert" className="login-error">
          {state.error} {state.error.includes("expired") && <Link href="/partner/forgot">Get a new link</Link>}
        </p>
      )}
      <label>
        <span>New password</span>
        <input type="password" name="password" required minLength={8} autoComplete="new-password" placeholder="At least 8 characters" />
      </label>
      <label>
        <span>New password again</span>
        <input type="password" name="confirm" required minLength={8} autoComplete="new-password" />
      </label>
      <button type="submit" disabled={pending}>{pending ? "Saving…" : "Save and sign in"}</button>
    </form>
  );
}
