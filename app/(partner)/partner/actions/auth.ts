"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/auth/supabase/server";
import { getPublicEnv } from "@/lib/config/env";
import { getSessionUser, requirePartnerWorkspace } from "@/lib/domains/identity/service";
import { changePassword, completePasswordReset, requestPasswordReset } from "@/lib/domains/identity/password";
import { AppError } from "@/lib/shared/errors";

function redirectLoginError(message: string): never {
  redirect(`/partner/login?error=${encodeURIComponent(message)}`);
}

export async function signInAction(formData: FormData): Promise<void> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    redirectLoginError("Email and password are required.");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirectLoginError(error.message);
  }

  // Only the Sweet'Oh partner may use this login; don't leave anyone else signed in.
  const session = await getSessionUser().catch(() => null);
  if (session?.role !== "partner") {
    await supabase.auth.signOut();
    redirect("/partner/login?error=partner_only");
  }

  redirect("/partner");
}

export async function signOutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/partner/login");
}

export type PasswordFormState = { error?: string; done?: boolean } | null;

function passwordProblem(error: unknown) {
  return error instanceof AppError ? error.message : "Something went wrong. Try again in a moment.";
}

/** Settings → change password (signed in). */
export async function changePasswordAction(_prev: PasswordFormState, form: FormData): Promise<PasswordFormState> {
  const session = await requirePartnerWorkspace();
  try {
    await changePassword(
      session,
      String(form.get("current") ?? ""),
      String(form.get("password") ?? ""),
      String(form.get("confirm") ?? ""),
    );
    return { done: true };
  } catch (error) {
    return { error: passwordProblem(error) };
  }
}

/** Login → "Forgot password?". Always answers the same, so it can't reveal which emails have accounts. */
export async function forgotPasswordAction(_prev: PasswordFormState, form: FormData): Promise<PasswordFormState> {
  await requestPasswordReset(String(form.get("email") ?? ""), getPublicEnv().siteUrl).catch(() => undefined);
  return { done: true };
}

/** The emailed link's page → set a new password, then straight into the back office. */
export async function resetPasswordAction(_prev: PasswordFormState, form: FormData): Promise<PasswordFormState> {
  try {
    await completePasswordReset(
      String(form.get("token") ?? ""),
      String(form.get("password") ?? ""),
      String(form.get("confirm") ?? ""),
    );
  } catch (error) {
    return { error: passwordProblem(error) };
  }
  redirect("/partner");
}
