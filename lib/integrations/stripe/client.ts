import Stripe from "stripe";
import { getServerEnv, isStripeConfigured } from "@/lib/config/env";
import { ValidationError } from "@/lib/shared/errors";

let client: Stripe | null = null;

export function getStripeClient(): Stripe {
  if (!isStripeConfigured()) {
    throw new ValidationError(
      "Stripe is not configured. Add STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET to .env.local.",
    );
  }

  if (!client) {
    client = new Stripe(getServerEnv().stripeSecretKey!);
  }

  return client;
}
