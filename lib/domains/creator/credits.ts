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

async function ensureMonthlyGrant(tx: Tx, userId: string, plan: Plan, planStatus?: string) {
  const amount = monthlyAllowance(plan, planStatus);
  const trial = planStatus === "trialing" && plan.trialCredits ? "trial" : plan.id;
  await tx
    .insert(creditLedger)
    .values({ userId, delta: String(amount), kind: "grant", reason: `${plan.name} monthly credits`, dedupeKey: `${periodKey()}:${trial}` })
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
export async function getCreditBalance(userId: string): Promise<{ balance: number; plan: Plan; status: string }> {
  const profile = await getCreatorProfile(userId);
  const plan = activePlan(profile);
  return getDb().transaction(async (tx) => {
    await ensureMonthlyGrant(tx, userId, plan, profile?.planStatus);
    return { balance: await balanceOf(tx, userId), plan, status: profile?.planStatus ?? "none" };
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
    const balance = await balanceOf(tx, input.userId);
    if (!input.allowOverdraft && balance < amount) throw new OutOfCreditsError(amount, balance);
    const [row] = await tx
      .insert(creditLedger)
      .values({ userId: input.userId, delta: String(-amount), kind: "usage", reason: input.reason, metadata: input.metadata ?? null })
      .returning({ id: creditLedger.id });
    return row.id;
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
    .values({ userId, delta: String(-Number(row.delta)), kind: "adjustment", reason: `Refund: ${row.reason}`, dedupeKey: `refund:${ledgerId}` })
    .onConflictDoNothing();
}

export async function addCredits(input: { userId: string; amount: number; kind: "topup" | "grant" | "adjustment"; reason: string; dedupeKey: string }) {
  await getDb()
    .insert(creditLedger)
    .values({ userId: input.userId, delta: String(input.amount), kind: input.kind, reason: input.reason, dedupeKey: input.dedupeKey })
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
