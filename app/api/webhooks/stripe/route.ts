import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getServerEnv, isStripeConfigured } from "@/lib/config/env";
import { createOrderFromCheckoutSession } from "@/lib/domains/commerce/service";
import { sendStorefrontOrderConfirmationEmail } from "@/lib/integrations/email/resend";
import { getStripeClient } from "@/lib/integrations/stripe/client";
import { readCheckoutCartItems } from "@/lib/integrations/stripe/checkout";
import { logger } from "@/lib/shared/logger";
import { handleCreatorBillingEvent } from "@/lib/integrations/stripe/billing";

export async function POST(request: Request) {
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: "Stripe is not configured" }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  const payload = await request.text();
  const stripe = getStripeClient();

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      payload,
      signature,
      getServerEnv().stripeWebhookSecret!,
    );
  } catch (error) {
    logger.error("stripe_webhook_signature_invalid", { error: String(error) });
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Create with Sweet'Oh: creator subscriptions, credit top-ups, print-request payments.
  try {
    if (await handleCreatorBillingEvent(event)) return NextResponse.json({ received: true });
  } catch (error) {
    logger.error("stripe_webhook_creator_billing_failed", { error: String(error), type: event.type });
    return NextResponse.json({ error: "Creator billing update failed" }, { status: 500 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    try {
      const cartItems = await readCheckoutCartItems(session);
      const { order, lineItems, isNew } = await createOrderFromCheckoutSession(session, cartItems);

      if (isNew) {
        await sendStorefrontOrderConfirmationEmail({
          to: order.customerEmail,
          orderId: order.id,
          totalCents: order.totalCents,
          lineItems,
        });
      }
    } catch (error) {
      logger.error("stripe_webhook_order_creation_failed", {
        error: String(error),
        sessionId: session.id,
      });
      return NextResponse.json({ error: "Order creation failed" }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}
