import { and, eq, sql } from "drizzle-orm";
import { createClient } from "@/lib/auth/supabase/server";
import { createAdminClient } from "@/lib/auth/supabase/admin";
import { getDb } from "@/lib/db/client";
import { customer } from "@/lib/db/schema";
import { getDefaultVenture } from "@/lib/domains/identity/service";
import { ValidationError } from "@/lib/shared/errors";
import { sendVerification } from "./verify";

/**
 * Shop customer accounts — deliberately tiny for launch: no dashboard, no AI.
 * Signing up lets a shopper send custom requests to the shop and lets Skink
 * look up their orders. The account is a Supabase auth user linked to the
 * `customer` row checkout already keys by email, so past orders line up.
 *
 * Customers never get an app_user row, so partner/creator code (which reads
 * app_user) can't mistake a shopper for staff.
 */
export type ShopCustomer = typeof customer.$inferSelect;

export async function getCurrentCustomer(): Promise<ShopCustomer | null> {
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getClaims();
    const sub = data?.claims?.sub;
    if (!sub) return null;
    const [row] = await getDb().select().from(customer).where(eq(customer.authUserId, sub)).limit(1);
    return row ?? null;
  } catch {
    return null;
  }
}

export async function signUpCustomer(input: { name: string; email: string; password: string; phone?: string | null }) {
  const venture = await getDefaultVenture();
  const email = input.email.trim().toLowerCase();
  const admin = createAdminClient();
  const created = await admin.auth.admin.createUser({
    email,
    password: input.password,
    email_confirm: true,
    user_metadata: { full_name: input.name, source: "sweetoh-shop" },
  });
  if (created.error || !created.data.user) {
    const taken = /already|registered|exists/i.test(created.error?.message ?? "");
    throw new ValidationError(taken ? "That email already has an account — sign in instead." : "Couldn't create your account. Try again.");
  }
  const authUserId = created.data.user.id;
  let row: ShopCustomer;
  try {
    // Checkout may already know this email from an earlier order — link that row.
    // Its orders stay hidden until the email is confirmed (see ./verify.ts).
    [row] = await getDb()
      .insert(customer)
      .values({ ventureId: venture.id, email, name: input.name, phone: input.phone || null, authUserId, signedUpAt: new Date() })
      .onConflictDoUpdate({
        target: [customer.ventureId, customer.email],
        set: {
          authUserId,
          name: input.name,
          phone: sql`coalesce(${input.phone || null}, ${customer.phone})`,
          signedUpAt: new Date(),
          emailVerifiedAt: null,
          updatedAt: new Date(),
        },
      })
      .returning();
  } catch (error) {
    await admin.auth.admin.deleteUser(authUserId).catch(() => undefined);
    throw error;
  }
  await sendVerification(row).catch(() => undefined);
  const supabase = await createClient();
  await supabase.auth.signInWithPassword({ email, password: input.password });
}

export async function signInCustomer(email: string, password: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
  if (error || !data.user) throw new ValidationError("That email and password don't match.");
  const venture = await getDefaultVenture();
  const [row] = await getDb()
    .select({ id: customer.id })
    .from(customer)
    .where(and(eq(customer.ventureId, venture.id), eq(customer.authUserId, data.user.id)))
    .limit(1);
  if (!row) {
    await supabase.auth.signOut();
    throw new ValidationError("This isn't a shop account. Shop staff sign in at /partner/login.");
  }
}

export async function signOutCustomer() {
  const supabase = await createClient();
  await supabase.auth.signOut();
}
