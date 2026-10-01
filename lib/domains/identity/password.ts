/**
 * Partner passwords: change it while signed in, or reset it by email.
 * Reset links are generated with the Supabase admin API and emailed from the
 * shop's own address (Resend), and the token is only redeemed when she
 * submits the new password — so mail scanners that pre-open links can't
 * burn it.
 */
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { sql, eq } from "drizzle-orm";
import { createAdminClient } from "@/lib/auth/supabase/admin";
import { createClient } from "@/lib/auth/supabase/server";
import { getPublicEnv } from "@/lib/config/env";
import { getDb } from "@/lib/db/client";
import { appUser, venture } from "@/lib/db/schema";
import { sendOwnerSignInEmail, sendPartnerPasswordResetEmail } from "@/lib/integrations/email/resend";
import { ValidationError } from "@/lib/shared/errors";
import { logger } from "@/lib/shared/logger";
import { upsertAppUserFromSeed } from "./service";
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

/**
 * Passwordless owner sign-in, gated by the caller to a single allowed address
 * (FOUNDATION_OWNER_EMAIL). Creates (or reuses) the owner's Supabase identity,
 * then emails a one-time link; the owner never types or sets a password.
 */
export async function provisionOwnerSignIn(email: string, siteUrl: string) {
  const address = email.trim().toLowerCase();
  if (!address) return;
  const admin = createAdminClient();

  let authUserId: string | undefined;
  const [existingAppUser] = await getDb()
    .select({ authUserId: appUser.authUserId, role: appUser.role })
    .from(appUser)
    .where(sql`lower(${appUser.email}) = ${address}`)
    .limit(1);
  if (existingAppUser) {
    if (existingAppUser.role !== "owner") {
      logger.error("owner_signup_email_in_use", { role: existingAppUser.role });
      return;
    }
    authUserId = existingAppUser.authUserId;
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email: address,
      // Unused: the owner only ever signs in through the emailed link below.
      password: crypto.randomUUID() + crypto.randomUUID(),
      email_confirm: true,
    });
    if (error || !data.user) {
      logger.error("owner_signup_create_failed", { error: error?.message });
      return;
    }
    authUserId = data.user.id;
  }

  const [ventureRow] = await getDb().select({ id: venture.id }).from(venture).where(eq(venture.slug, "sweetoh")).limit(1);
  if (!ventureRow) {
    logger.error("owner_signup_no_venture", {});
    return;
  }
  await upsertAppUserFromSeed({ ventureId: ventureRow.id, authUserId, email: address, role: "owner" });

  const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email: address });
  if (error || !data.properties?.hashed_token) {
    logger.error("owner_signup_link_failed", { error: error?.message });
    return;
  }
  const url = `${siteUrl.replace(/\/$/, "")}/owner/verify?token=${encodeURIComponent(data.properties.hashed_token)}`;
  await sendOwnerSignInEmail({ to: address, url });
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


/** Redeem the emailed owner link and open the owner session. Owner role only. */
export async function redeemOwnerSignIn(token: string) {
  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ token_hash: token, type: "magiclink" });
  if (error) throw new ValidationError("This sign-in link has expired or was already used. Ask for a new one.");
}
