"use server";

import { actionBlocked, MINUTES, TOO_MANY_ATTEMPTS } from "@/lib/shared/action-limit";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/auth/supabase/server";
import { getPublicEnv } from "@/lib/config/env";
import { getSessionUser, requirePartnerWorkspace } from "@/lib/domains/identity/service";
import { changePassword, completePasswordReset, provisionOwnerSignIn, redeemOwnerSignIn, requestPasswordReset } from "@/lib/domains/identity/password";
import { AppError } from "@/lib/shared/errors";
import { logger } from "@/lib/shared/logger";

function redirectLoginError(message: string): never {
  redirect(`/partner/login?error=${encodeURIComponent(message)}`);
}

export async function signInAction(formData: FormData): Promise<void> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (await actionBlocked("partner-sign-in", { limit: 12, windowMs: MINUTES(10), target: email, targetLimit: 6 })) redirectLoginError(TOO_MANY_ATTEMPTS);

  if (!email || !password) {
    redirectLoginError("Enter your email and password to sign in.");
  }

  const supabase = await createClient();
  let authError: { status?: number } | null;
  try {
    ({ error: authError } = await supabase.auth.signInWithPassword({ email, password }));
  } catch {
    redirectLoginError("We couldn't connect to sign in. Check your connection and try again.");
  }

  if (authError) {
    redirectLoginError(
      authError.status === 400
        ? "That email and password didn't match. Check your details and try again."
        : "Sign-in couldn't be completed just now. Please try again in a moment.",
    );
  }

  // Only the Sweet'Oh partner may use this login; don't leave anyone else signed in.
  let session;
  try {
    session = await getSessionUser();
  } catch {
    await supabase.auth.signOut().catch(() => undefined);
    redirectLoginError("We couldn't verify your account just now. Please try signing in again.");
  }
  if (session?.role !== "partner") {
    await supabase.auth.signOut();
    redirect("/partner/login?error=partner_only");
  }

  redirect("/partner");
}

/**
 * Owner email-link sign-in, gated to the single address in FOUNDATION_OWNER_EMAIL.
 * Always answers the same way, so it never reveals whether an address matched.
 */
export async function signUpOwnerAction(_prev: PasswordFormState, form: FormData): Promise<PasswordFormState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  if (!email) return { error: "Enter your email." };
  // Past the limit we quietly send nothing: the answer stays the same, so nothing leaks and the inbox is not flooded.
  if (await actionBlocked("owner-link", { limit: 5, windowMs: MINUTES(60), target: email, targetLimit: 3 })) return { done: true };
  try {
    const allowed = (process.env.FOUNDATION_OWNER_EMAIL ?? "").trim().toLowerCase();
    if (allowed && email === allowed) {
      await provisionOwnerSignIn(email, getPublicEnv().siteUrl);
    }
  } catch (error) {
    logger.error("owner_signup_action_failed", { error: error instanceof Error ? error.message : String(error) });
  }
  return { done: true };
}

export async function signOutAction(): Promise<void> {
  const session = await getSessionUser().catch(() => null);
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect(session?.role === "owner" ? "/owner/login" : "/partner/login");
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
  if (await actionBlocked("forgot-password", { limit: 6, windowMs: MINUTES(60), target: String(form.get("email") ?? ""), targetLimit: 3 })) return { done: true };
  await requestPasswordReset(String(form.get("email") ?? ""), getPublicEnv().siteUrl).catch(() => undefined);
  return { done: true };
}

/** The emailed link's page → set a new password, then straight into the back office. */
export async function resetPasswordAction(_prev: PasswordFormState, form: FormData): Promise<PasswordFormState> {
  if (await actionBlocked("reset-password", { limit: 10, windowMs: MINUTES(60) })) return { error: TOO_MANY_ATTEMPTS };
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

/** Completes the emailed owner link (a click, so mail scanners can't burn it). */
export async function verifyOwnerAction(formData: FormData): Promise<void> {
  const token = String(formData.get("token") ?? "");
  if (await actionBlocked("owner-verify", { limit: 10, windowMs: MINUTES(10) })) redirect("/owner/login?error=" + encodeURIComponent(TOO_MANY_ATTEMPTS));
  if (!token) redirect("/owner/login?error=" + encodeURIComponent("That sign-in link is incomplete. Ask for a new one."));
  try {
    await redeemOwnerSignIn(token);
  } catch (error) {
    redirect("/owner/login?error=" + encodeURIComponent(error instanceof AppError ? error.message : "Sign-in couldn't be completed. Ask for a new link."));
  }
  const supabase = await createClient();
  const session = await getSessionUser().catch(() => null);
  if (session?.role !== "owner") {
    await supabase.auth.signOut().catch(() => undefined);
    redirect("/owner/login?error=owner_only");
  }
  redirect("/partner");
}
