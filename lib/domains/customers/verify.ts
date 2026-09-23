import { createHmac, timingSafeEqual } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { customer } from "@/lib/db/schema";
import { getPublicEnv } from "@/lib/config/env";
import { sendCustomerVerifyEmail } from "@/lib/integrations/email/resend";
import type { ShopCustomer } from "./account";

/**
 * Email confirmation for shop accounts. Accounts are usable right away for
 * custom requests, but order details are private: Skink only shows orders once
 * the customer proves they own the email by clicking this link.
 */
const TTL_MS = 3 * 24 * 60 * 60 * 1000;

function key() {
  const raw = process.env.CREATOR_SECRETS_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!raw) throw new Error("No key available to sign email confirmations.");
  return `customer-verify:${raw}`;
}

function sign(payload: string) {
  return createHmac("sha256", key()).update(payload).digest("base64url");
}

export function verifyToken(shopper: Pick<ShopCustomer, "id" | "email">, now = Date.now()) {
  const payload = Buffer.from(JSON.stringify({ c: shopper.id, e: shopper.email.toLowerCase(), x: now + TTL_MS })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export async function confirmCustomerEmail(token: string): Promise<boolean> {
  const [payload, mac] = token.split(".");
  if (!payload || !mac) return false;
  const expected = Buffer.from(sign(payload));
  const given = Buffer.from(mac);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return false;
  let data: { c?: string; e?: string; x?: number };
  try {
    data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return false;
  }
  if (!data.c || !data.e || !data.x || data.x < Date.now()) return false;
  const rows = await getDb()
    .update(customer)
    .set({ emailVerifiedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(customer.id, data.c), eq(customer.email, data.e)))
    .returning({ id: customer.id });
  return rows.length > 0;
}

export async function sendVerification(shopper: ShopCustomer) {
  const url = `${getPublicEnv().siteUrl.replace(/\/$/, "")}/account/verify?token=${encodeURIComponent(verifyToken(shopper))}`;
  await sendCustomerVerifyEmail({ to: shopper.email, customerName: shopper.name, url });
}
