"use server";

import { actionBlocked, MINUTES, TOO_MANY_ATTEMPTS } from "@/lib/shared/action-limit";
import { redirect } from "next/navigation";
import { getDefaultVenture } from "@/lib/domains/identity/service";
import { createCartCheckoutSession } from "@/lib/integrations/stripe/checkout";
import { getActionErrorMessage } from "@/lib/shared/action-errors";

export async function createCheckoutSessionAction(
  items: {
    productId: string;
    color?: string | null;
    size?: string | null;
    quantity: number;
  }[],
): Promise<{ error: string } | void> {
  // Guest checkout is public by design; each call creates a Stripe session, so it is limited.
  if (await actionBlocked("checkout", { limit: 20, windowMs: MINUTES(10) })) return { error: TOO_MANY_ATTEMPTS };
  let checkoutUrl: string;

  try {
    const venture = await getDefaultVenture();
    const session = await createCartCheckoutSession({
      ventureId: venture.id,
      items,
    });

    if (!session.url) {
      throw new Error("Stripe did not return a checkout URL.");
    }

    checkoutUrl = session.url;
  } catch (error) {
    return { error: getActionErrorMessage(error) };
  }

  redirect(checkoutUrl);
}
