import { headers } from "next/headers";
import { rateLimit } from "./rate-limit";

export const TOO_MANY_ATTEMPTS = "Too many attempts. Please wait a few minutes and try again.";

/**
 * Rate limits for public server actions (sign-in, sign-up, emailed links). Counts
 * the caller's address and, optionally, the account being targeted, so neither
 * one address guessing many accounts nor many addresses hammering one account
 * gets through unbounded. Per server instance; add a Vercel Firewall rule for a
 * hard global cap.
 */
export async function actionBlocked(scope: string, opts: { limit: number; windowMs: number; target?: string; targetLimit?: number }): Promise<boolean> {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
  if (!rateLimit(`${scope}:ip:${ip}`, opts.limit, opts.windowMs).ok) return true;
  const target = opts.target?.trim().toLowerCase();
  if (target && !rateLimit(`${scope}:target:${target}`, opts.targetLimit ?? opts.limit, opts.windowMs).ok) return true;
  return false;
}

export const MINUTES = (n: number) => n * 60_000;
