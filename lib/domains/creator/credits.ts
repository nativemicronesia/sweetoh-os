import { and, eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { creatorProfile, creditLedger } from "@/lib/db/schema";
import { ValidationError } from "@/lib/shared/errors";
import { planFor, formatCredits, type Plan } from "./plans";

type Tx = Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0];

export class OutOfCreditsError extends ValidationError {
  constructor(public readonly needed: number, public readonly balance: number) {
    super(
      `You need ${formatCredits(needed)} credits for this and have ${formatCredits(balance)}. Upgrade or top up on the Plans page — your designs and manual tools still work.`,
    );
  }
}

export async function getCreatorProfile(userId: string) {
  const [row] = await getDb().select().from(creatorProfile).where(eq(creatorProfile.userId, userId)).limit(1);
  return row ?? null;
}

/** Plan in force right now (a lapsed subscription falls back to Free). */
export function activePlan(profile: { plan: string; planStatus: string } | null): Plan {
  if (!profile) return planFor("free");
  const live = ["active", "trialing", "past_due"].includes(profile.planStatus);
  if (profile.plan !== "free" && !live) return planFor("free");
  return planFor(profile.plan);
}

/** Credits granted this month: a plan on its free trial gets the trial allowance. */
export function monthlyAllowance(plan: Plan, planStatus: string | undefined): number {
  return planStatus === "trialing" && plan.trialCredits ? plan.trialCredits : plan.monthlyCredits;
}

function periodKey(now = new Date()) {
  return `grant:${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

/**
 * Two buckets, so a plan feels like a monthly allowance rather than a savings
 * account: `plan` credits are granted each month and whatever is left expires
 * when the next month's grant lands; `wallet` credits were paid for (top-ups)
 * and never expire. Spending draws from the plan bucket first.
 */
export type Bucket = "plan" | "wallet";
const BUCKET = sql`coalesce(${creditLedger.metadata} ->> 'bucket', 'plan')`;

async function bucketBalance(tx: Tx | ReturnType<typeof getDb>, userId: string, bucket: Bucket): Promise<number> {
  const [row] = await tx
    .select({ total: sql<string>`coalesce(sum(${creditLedger.delta}), 0)` })
    .from(creditLedger)
    .where(and(eq(creditLedger.userId, userId), sql`${BUCKET} = ${bucket}`));
  return Number(row?.total ?? 0);
}

async function ensureMonthlyGrant(tx: Tx, userId: string, plan: Plan, planStatus?: string) {
  const amount = monthlyAllowance(plan, planStatus);
  const trial = planStatus === "trialing" && plan.trialCredits ? "trial" : plan.id;
  const key = `${periodKey()}:${trial}`;
  const [already] = await tx
    .select({ id: creditLedger.id })
    .from(creditLedger)
    .where(and(eq(creditLedger.userId, userId), eq(creditLedger.dedupeKey, key)))
    .limit(1);
  if (already) return;
  // New month: last month's unused plan credits expire before the new ones land.
  const leftover = await bucketBalance(tx, userId, "plan");
  if (leftover > 0) {
    await tx
      .insert(creditLedger)
      .values({
        userId,
        delta: String(-leftover),
        kind: "adjustment",
        reason: "Monthly credits reset",
        dedupeKey: `expire:${periodKey()}`,
        metadata: { bucket: "plan" },
      })
      .onConflictDoNothing();
  }
  await tx
    .insert(creditLedger)
    .values({ userId, delta: String(amount), kind: "grant", reason: `${plan.name} monthly credits`, dedupeKey: key, metadata: { bucket: "plan" } })
    .onConflictDoNothing();
}

async function balanceOf(tx: Tx | ReturnType<typeof getDb>, userId: string): Promise<number> {
  const [row] = await tx
    .select({ total: sql<string>`coalesce(sum(${creditLedger.delta}), 0)` })
    .from(creditLedger)
    .where(eq(creditLedger.userId, userId));
  return Number(row?.total ?? 0);
}

/** Current balance, granting this month's plan credits on first touch. */
export async function getCreditBalance(userId: string): Promise<{ balance: number; plan: Plan; status: string; monthly: number; wallet: number }> {
  const profile = await getCreatorProfile(userId);
  const plan = activePlan(profile);
  return getDb().transaction(async (tx) => {
    await ensureMonthlyGrant(tx, userId, plan, profile?.planStatus);
    const [monthly, wallet] = await Promise.all([bucketBalance(tx, userId, "plan"), bucketBalance(tx, userId, "wallet")]);
    return { balance: monthly + wallet, plan, status: profile?.planStatus ?? "none", monthly, wallet };
  });
}

/**
 * Atomically spend credits. Serialized per user so parallel clicks can't
 * overdraw. Returns the ledger id so a failed AI call can be refunded.
 */
export async function spendCredits(input: {
  userId: string;
  amount: number;
  reason: string;
  metadata?: Record<string, unknown>;
  /** Allow a small overdraft (metered chat is charged after the fact). */
  allowOverdraft?: boolean;
}): Promise<string> {
  const amount = Math.max(0, Math.round(input.amount * 1000) / 1000);
  const profile = await getCreatorProfile(input.userId);
  const plan = activePlan(profile);
  return getDb().transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${"credits:" + input.userId}))`);
    await ensureMonthlyGrant(tx, input.userId, plan, profile?.planStatus);
    const monthly = await bucketBalance(tx, input.userId, "plan");
    const wallet = await bucketBalance(tx, input.userId, "wallet");
    if (!input.allowOverdraft && monthly + wallet < amount) throw new OutOfCreditsError(amount, monthly + wallet);
    // This month's allowance goes first; paid top-ups are the reserve.
    const fromPlan = Math.min(amount, Math.max(0, monthly));
    const fromWallet = Math.round((amount - fromPlan) * 1000) / 1000;
    const rows = await tx
      .insert(creditLedger)
      .values(
        [
          fromPlan > 0 || fromWallet === 0
            ? { userId: input.userId, delta: String(-fromPlan), kind: "usage", reason: input.reason, metadata: { ...(input.metadata ?? {}), bucket: "plan" } }
            : null,
          fromWallet > 0
            ? { userId: input.userId, delta: String(-fromWallet), kind: "usage", reason: input.reason, metadata: { ...(input.metadata ?? {}), bucket: "wallet" } }
            : null,
        ].filter((v): v is NonNullable<typeof v> => v !== null),
      )
      .returning({ id: creditLedger.id });
    return rows[0].id;
  });
}

/** Undo a charge whose AI call failed. */
export async function refundCredits(userId: string, ledgerId: string) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(creditLedger)
    .where(and(eq(creditLedger.id, ledgerId), eq(creditLedger.userId, userId)))
    .limit(1);
  if (!row || row.kind !== "usage") return;
  await db
    .insert(creditLedger)
    .values({
      userId,
      delta: String(-Number(row.delta)),
      kind: "adjustment",
      reason: `Refund: ${row.reason}`,
      dedupeKey: `refund:${ledgerId}`,
      metadata: { bucket: (row.metadata as { bucket?: string } | null)?.bucket ?? "plan" },
    })
    .onConflictDoNothing();
}

export async function addCredits(input: { userId: string; amount: number; kind: "topup" | "grant" | "adjustment"; reason: string; dedupeKey: string; bucket?: Bucket }) {
  // Paid top-ups land in the wallet, which never expires.
  const bucket: Bucket = input.bucket ?? (input.kind === "topup" ? "wallet" : "plan");
  await getDb()
    .insert(creditLedger)
    .values({ userId: input.userId, delta: String(input.amount), kind: input.kind, reason: input.reason, dedupeKey: input.dedupeKey, metadata: { bucket } })
    .onConflictDoNothing();
}

export async function recentCreditActivity(userId: string, limit = 20) {
  return getDb()
    .select()
    .from(creditLedger)
    .where(eq(creditLedger.userId, userId))
    .orderBy(sql`${creditLedger.createdAt} desc`)
    .limit(limit);
}
