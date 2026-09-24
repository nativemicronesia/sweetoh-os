"use client";

import { useActionState, useEffect, useRef } from "react";
import { changePasswordAction, type PasswordFormState } from "../actions/auth";

export function ChangePasswordForm() {
  const [state, action, pending] = useActionState<PasswordFormState, FormData>(changePasswordAction, null);
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.done) form.current?.reset();
  }, [state]);

  return (
    <form ref={form} action={action} className="pw-form">
      <label>
        Current password
        <input type="password" name="current" required autoComplete="current-password" />
      </label>
      <label>
        New password
        <input type="password" name="password" required minLength={8} autoComplete="new-password" placeholder="At least 8 characters" />
      </label>
      <label>
        New password again
        <input type="password" name="confirm" required minLength={8} autoComplete="new-password" />
      </label>
      <div className="pw-foot">
        <span role="status" data-tone={state?.error ? "error" : state?.done ? "ok" : undefined}>
          {state?.error ?? (state?.done ? "Password changed. Use the new one next time you sign in." : "")}
        </span>
        <button type="submit" className="pf-btn pf-btn-primary" disabled={pending}>
          {pending ? "Saving…" : "Change password"}
        </button>
      </div>
    </form>
  );
}
