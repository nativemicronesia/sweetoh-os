/**
 * Partner passwords: change it while signed in, or reset it by email.
 * Reset links are generated with the Supabase admin API and emailed from the
 * shop's own address (Resend), and the token is only redeemed when she
 * submits the new password — so mail scanners that pre-open links can't
 * burn it.
 */
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { sql } from "drizzle-orm";
import { createAdminClient } from "@/lib/auth/supabase/admin";
import { createClient } from "@/lib/auth/supabase/server";
import { getPublicEnv } from "@/lib/config/env";
import { getDb } from "@/lib/db/client";
import { appUser } from "@/lib/db/schema";
import { sendPartnerPasswordResetEmail } from "@/lib/integrations/email/resend";
import { ValidationError } from "@/lib/shared/errors";
import { logger } from "@/lib/shared/logger";
import type { SessionUser } from "./types";

export const MIN_PASSWORD = 8;

export function checkNewPassword(password: string, confirm: string) {
  if (password.length < MIN_PASSWORD) throw new ValidationError(`Use at least ${MIN_PASSWORD} characters.`);
  if (password.length > 128) throw new ValidationError("That password is too long.");
  if (password !== confirm) throw new ValidationError("The two new passwords don't match.");
}

/** Signed in: confirm the current password, then set the new one. */
export async function changePassword(session: SessionUser, current: string, next: string, confirm: string) {
  checkNewPassword(next, confirm);
  if (current === next) throw new ValidationError("Pick a password different from the current one.");
  const { supabaseUrl, supabaseAnonKey } = getPublicEnv();
  // A throwaway client, so checking the old password doesn't touch her real session cookies.
  const probe = createSupabaseClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error: wrong } = await probe.auth.signInWithPassword({ email: session.appUser.email, password: current });
  if (wrong) throw new ValidationError("Your current password isn't right.");
  await probe.auth.signOut().catch(() => undefined);
  const { error } = await createAdminClient().auth.admin.updateUserById(session.authUserId, { password: next });
  if (error) throw new ValidationError(error.message);
  // Supabase ends existing sessions when the password changes; sign this one back in so she stays put.
  const supabase = await createClient();
  const { error: resign } = await supabase.auth.signInWithPassword({ email: session.appUser.email, password: next });
  if (resign) logger.error("partner_password_resignin_failed", { error: resign.message });
}

/** Emails a reset link — only for back-office accounts; says nothing either way. */
export async function requestPasswordReset(email: string, siteUrl: string) {
  const address = email.trim().toLowerCase();
  if (!address) return;
  const [user] = await getDb()
    .select({ name: appUser.name, role: appUser.role })
    .from(appUser)
    .where(sql`lower(${appUser.email}) = ${address}`)
    .limit(1);
  if (!user || !["partner", "owner"].includes(user.role)) return;
  const { data, error } = await createAdminClient().auth.admin.generateLink({ type: "recovery", email: address });
  if (error || !data.properties?.hashed_token) {
    logger.error("partner_reset_link_failed", { error: error?.message });
    return;
  }
  const url = `${siteUrl.replace(/\/$/, "")}/partner/reset?token=${encodeURIComponent(data.properties.hashed_token)}`;
  await sendPartnerPasswordResetEmail({ to: address, name: user.name, url });
}

/** Redeem the emailed token (signs her in) and set the new password. */
export async function completePasswordReset(token: string, next: string, confirm: string) {
  checkNewPassword(next, confirm);
  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ token_hash: token, type: "recovery" });
  if (error) throw new ValidationError("This reset link has expired or was already used. Ask for a new one.");
  const { error: update } = await supabase.auth.updateUser({ password: next });
  if (update) throw new ValidationError(update.message);
}

