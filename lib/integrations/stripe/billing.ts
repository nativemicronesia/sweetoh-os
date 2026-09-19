import type Stripe from "stripe";
import { eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { creatorProfile } from "@/lib/db/schema";
import { getPublicEnv } from "@/lib/config/env";
import { FOUNDING_SPOTS, PLANS, TOPUP, type PlanId } from "@/lib/domains/creator/plans";
import { addCredits } from "@/lib/domains/creator/credits";
import { markPrintRequestPaid } from "@/lib/domains/creator/print-requests-billing";
import { ValidationError } from "@/lib/shared/errors";
import { getStripeClient } from "./client";

/**
 * Create with Sweet'Oh billing. Prices are sent inline (price_data), so the
 * only Stripe setup needed is the API keys + webhook — swapping test keys for
 * live keys switches real billing on with no code change.
 */
export type CheckoutKind = "creator_subscription" | "credit_topup" | "print_request";

export async function foundingSpotsLeft(): Promise<number> {
  const [row] = await getDb()
    .select({ n: sql<number>`count(*)::int` })
    .from(creatorProfile)
    .where(eq(creatorProfile.founding, true));
  return Math.max(0, FOUNDING_SPOTS - (row?.n ?? 0));
}

function site(path: string) {
  return new URL(path, getPublicEnv().siteUrl).toString();
}

export async function createSubscriptionCheckout(input: {
  userId: string;
  email: string;
  customerId: string | null;
  plan: Exclude<PlanId, "free">;
  interval: "month" | "year";
}) {
  const plan = PLANS[input.plan];
  const founding = input.interval === "year" && (await foundingSpotsLeft()) > 0;
  const amount = input.interval === "month" ? plan.monthlyCents : founding ? plan.foundingYearlyCents : plan.yearlyCents;
  const metadata = { kind: "creator_subscription", userId: input.userId, plan: plan.id, interval: input.interval, founding: String(founding) };
  const session = await getStripeClient().checkout.sessions.create({
    mode: "subscription",
    ...(input.customerId ? { customer: input.customerId } : { customer_email: input.email }),
    client_reference_id: input.userId,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: amount,
          recurring: { interval: input.interval },
          product_data: {
            name: `Sweet'Oh ${plan.name}${founding ? " — Founding Creator" : ""}`,
            description: `${plan.monthlyCredits.toLocaleString()} Sweet'Oh AI credits every month. ${plan.tagline}.`,
          },
        },
      },
    ],
    metadata,
    subscription_data: { metadata },
    allow_promotion_codes: true,
    success_url: site(`/studio/plans?success=${plan.id}`),
    cancel_url: site("/studio/plans?canceled=1"),
  });
  if (!session.url) throw new ValidationError("Couldn't start checkout. Try again.");
  return session.url;
}

export async function createTopupCheckout(input: { userId: string; email: string; customerId: string | null }) {
  const session = await getStripeClient().checkout.sessions.create({
    mode: "payment",
    ...(input.customerId ? { customer: input.customerId } : { customer_email: input.email }),
    client_reference_id: input.userId,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: TOPUP.cents,
          product_data: { name: `${TOPUP.credits} Sweet'Oh AI credits`, description: "Top-up credits never expire." },
        },
      },
    ],
    metadata: { kind: "credit_topup", userId: input.userId, credits: String(TOPUP.credits) },
    success_url: site("/studio/plans?topup=1"),
    cancel_url: site("/studio/plans"),
  });
  if (!session.url) throw new ValidationError("Couldn't start checkout. Try again.");
  return session.url;
}

export async function createPrintRequestCheckout(input: { requestId: string; userId: string; email: string; productName: string; quoteCents: number }) {
  const session = await getStripeClient().checkout.sessions.create({
    mode: "payment",
    customer_email: input.email,
    client_reference_id: input.userId,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: input.quoteCents,
          product_data: { name: `Print order — ${input.productName}`.slice(0, 200), description: "Printed by Sweet'Oh Creations, Lacey WA" },
        },
      },
    ],
    metadata: { kind: "print_request", userId: input.userId, requestId: input.requestId },
    success_url: site(`/studio/requests?paid=${input.requestId}`),
    cancel_url: site("/studio/requests"),
  });
  if (!session.url) throw new ValidationError("Couldn't start checkout. Try again.");
  return { url: session.url, id: session.id };
}

export async function createBillingPortal(customerId: string) {
  const portal = await getStripeClient().billingPortal.sessions.create({ customer: customerId, return_url: site("/studio/plans") });
  return portal.url;
}

/* ---------- Webhook handling ---------- */

function periodEnd(sub: Stripe.Subscription): Date | null {
  // Newer Stripe API versions moved the period onto subscription items.
  const item = sub.items?.data?.[0] as unknown as { current_period_end?: number } | undefined;
  const end = (sub as unknown as { current_period_end?: number }).current_period_end ?? item?.current_period_end;
  return end ? new Date(end * 1000) : null;
}

/** Returns true when the event belonged to Create with Sweet'Oh (and was handled). */
export async function handleCreatorBillingEvent(event: Stripe.Event): Promise<boolean> {
  const db = getDb();
  if (event.type === "checkout.session.completed") {
    const s = event.data.object as Stripe.Checkout.Session;
    const kind = s.metadata?.kind as CheckoutKind | undefined;
    const userId = s.metadata?.userId;
    if (!kind || !userId) return false;
    if (kind === "creator_subscription") {
      const plan = s.metadata?.plan === "pro" ? "pro" : "creator";
      let end: Date | null = null;
      if (typeof s.subscription === "string") {
        const sub = await getStripeClient().subscriptions.retrieve(s.subscription).catch(() => null);
        end = sub ? periodEnd(sub) : null;
      }
      await db
        .update(creatorProfile)
        .set({
          plan,
          planStatus: "active",
          billingInterval: s.metadata?.interval === "year" ? "year" : "month",
          founding: s.metadata?.founding === "true" ? true : undefined,
          stripeCustomerId: typeof s.customer === "string" ? s.customer : null,
          stripeSubscriptionId: typeof s.subscription === "string" ? s.subscription : null,
          currentPeriodEnd: end,
          updatedAt: new Date(),
        })
        .where(eq(creatorProfile.userId, userId));
      return true;
    }
    if (kind === "credit_topup") {
      if (s.payment_status !== "paid") return true;
      await addCredits({ userId, amount: Number(s.metadata?.credits ?? TOPUP.credits), kind: "topup", reason: "Credit top-up", dedupeKey: `stripe:${s.id}` });
      if (typeof s.customer === "string") {
        await db.update(creatorProfile).set({ stripeCustomerId: s.customer }).where(eq(creatorProfile.userId, userId));
      }
      return true;
    }
    if (kind === "print_request") {
      await markPrintRequestPaid(s.metadata?.requestId ?? "", s.id);
      return true;
    }
    return false;
  }
  if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
    const sub = event.data.object as Stripe.Subscription;
    const userId = sub.metadata?.userId;
    if (sub.metadata?.kind !== "creator_subscription" || !userId) return false;
    const status = event.type === "customer.subscription.deleted" ? "canceled" : sub.status === "active" || sub.status === "trialing" ? "active" : sub.status === "past_due" ? "past_due" : "canceled";
    await db
      .update(creatorProfile)
      .set({ planStatus: status, currentPeriodEnd: periodEnd(sub), updatedAt: new Date() })
      .where(eq(creatorProfile.userId, userId));
    return true;
  }
  return false;
}
