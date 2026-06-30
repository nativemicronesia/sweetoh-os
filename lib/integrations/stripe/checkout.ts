import {
  getActiveProductById,
  type Product,
} from "@/lib/domains/catalog/service";
import { getPublicEnv } from "@/lib/config/env";
import { ValidationError } from "@/lib/shared/errors";
import { getStripeClient } from "./client";

export type CartCheckoutItem = {
  productId: string;
  quantity: number;
};

type ResolvedCartItem = { product: Product; quantity: number };

export async function createCartCheckoutSession(input: {
  ventureId: string;
  items: CartCheckoutItem[];
}) {
  if (input.items.length === 0) {
    throw new ValidationError("Cart is empty.");
  }

  const resolved = await Promise.all(
    input.items.map(async (item): Promise<ResolvedCartItem | null> => {
      try {
        const product = await getActiveProductById({
          ventureId: input.ventureId,
          productId: item.productId,
        });

        return { product, quantity: item.quantity };
      } catch {
        return null;
      }
    }),
  );

  const available = resolved.filter(
    (item): item is ResolvedCartItem => item !== null,
  );

  if (available.length === 0) {
    throw new ValidationError(
      "None of the items in your cart are available anymore.",
    );
  }

  const cartItemsMetadata = available.map(({ product, quantity }) => ({
    productId: product.id,
    productName: product.name,
    priceCentsAtPurchase: product.priceCents,
    quantity,
  }));

  const { siteUrl } = getPublicEnv();
  const stripe = getStripeClient();

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: available.map(({ product, quantity }) => ({
      quantity,
      price_data: {
        currency: "usd",
        unit_amount: product.priceCents,
        product_data: { name: product.name },
      },
    })),
    success_url: `${siteUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${siteUrl}/cart`,
    metadata: {
      ventureId: input.ventureId,
      cartItems: JSON.stringify(cartItemsMetadata),
    },
  });

  if (!session.url) {
    throw new Error("Stripe did not return a checkout session URL.");
  }

  return session;
}
