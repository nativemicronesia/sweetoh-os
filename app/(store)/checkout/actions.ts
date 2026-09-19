"use server";

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
