"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { isStripeConfigured } from "@/lib/config/env";
import { requireCreator } from "@/lib/domains/identity/service";
import { getCreatorProfile } from "@/lib/domains/creator/credits";
import { getCreatorRequest, updateShopRequest } from "@/lib/domains/creator/print-requests";
import { createBillingPortal, createPrintRequestCheckout, createSubscriptionCheckout, createTopupCheckout } from "@/lib/integrations/stripe/billing";

function back(message: string, path = "/studio/plans"): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

export async function startSubscriptionAction(form: FormData) {
  const session = await requireCreator();
  if (!isStripeConfigured()) back("Payments aren't switched on yet — check back very soon.");
  const plan = z.enum(["creator", "pro"]).parse(form.get("plan"));
  const interval = z.enum(["month", "year"]).parse(form.get("interval"));
  const profile = await getCreatorProfile(session.appUser.id);
  if (profile?.plan === plan && profile.planStatus === "active") back(`You're already on ${plan === "pro" ? "Pro" : "Creator"}.`);
  let url: string;
  try {
    url = await createSubscriptionCheckout({ userId: session.appUser.id, email: session.appUser.email, customerId: profile?.stripeCustomerId ?? null, plan, interval });
  } catch (error) {
    console.error("subscription_checkout_failed", error instanceof Error ? error.message : error);
    back("Couldn't open checkout. Try again in a moment.");
  }
  redirect(url);
}

export async function topUpAction() {
  const session = await requireCreator();
  if (!isStripeConfigured()) back("Payments aren't switched on yet — check back very soon.");
  const profile = await getCreatorProfile(session.appUser.id);
  if (!profile || profile.plan === "free" || profile.planStatus !== "active") back("Top-ups are available on Creator and Pro.");
  let url: string;
  try {
    url = await createTopupCheckout({ userId: session.appUser.id, email: session.appUser.email, customerId: profile.stripeCustomerId });
  } catch (error) {
    console.error("topup_checkout_failed", error instanceof Error ? error.message : error);
    back("Couldn't open checkout. Try again in a moment.");
  }
  redirect(url);
}

export async function billingPortalAction() {
  const session = await requireCreator();
  const profile = await getCreatorProfile(session.appUser.id);
  if (!profile?.stripeCustomerId) back("No billing account yet.");
  let url: string;
  try {
    url = await createBillingPortal(profile.stripeCustomerId);
  } catch (error) {
    console.error("billing_portal_failed", error instanceof Error ? error.message : error);
    back("The billing portal isn't available right now. Email Sweet'Oh and we'll help.");
  }
  redirect(url);
}

export async function payPrintRequestAction(form: FormData) {
  const session = await requireCreator();
  const id = z.string().uuid().parse(form.get("id"));
  const request = await getCreatorRequest(session.appUser.id, id);
  if (request.status !== "quoted" || !request.quoteCents) back("This request isn't ready to pay yet.", "/studio/requests");
  if (!isStripeConfigured()) back("Payments aren't switched on yet.", "/studio/requests");
  let url: string;
  try {
    const checkout = await createPrintRequestCheckout({ requestId: id, userId: session.appUser.id, email: session.appUser.email, productName: request.productName, quoteCents: request.quoteCents });
    await updateShopRequest(request.shopVentureId, id, { stripeSessionId: checkout.id });
    url = checkout.url;
  } catch (error) {
    console.error("print_request_checkout_failed", error instanceof Error ? error.message : error);
    back("Couldn't open checkout. Try again in a moment.", "/studio/requests");
  }
  redirect(url);
}

export async function cancelPrintRequestAction(form: FormData) {
  const session = await requireCreator();
  const id = z.string().uuid().parse(form.get("id"));
  const request = await getCreatorRequest(session.appUser.id, id);
  if (!["new", "quoted"].includes(request.status)) back("This request can't be canceled now.", "/studio/requests");
  await updateShopRequest(request.shopVentureId, id, { status: "canceled" });
  redirect("/studio/requests");
}
