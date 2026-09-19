import type Stripe from "stripe";
import {
  getActiveProductById,
  type Product,
} from "@/lib/domains/catalog/service";
import {
  assertVariantSelection,
  unitPriceCents,
  variantLabel,
} from "@/lib/domains/catalog/variants";
import type { CheckoutCartItemMetadata } from "@/lib/domains/commerce/types";
import { getPublicEnv } from "@/lib/config/env";
import { ValidationError } from "@/lib/shared/errors";
import { getStripeClient } from "./client";

export type CartCheckoutItem = {
  productId: string;
  color?: string | null;
  size?: string | null;
  quantity: number;
};

type ResolvedCartItem = {
  product: Product;
  color: string | null;
  size: string | null;
  quantity: number;
  unitCents: number;
};

/**
 * Where the shop delivers. FSM, Palau, the Marshall Islands, CNMI and
 * American Samoa use US-style addresses (969xx ZIPs), which Stripe collects
 * under "US" with the territory as the state — Stripe doesn't list them as
 * countries.
 */
const SHIPPING_COUNTRIES: Stripe.Checkout.SessionCreateParams.ShippingAddressCollection.AllowedCountry[] =
  ["US", "GU"];

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
        const quantity = Math.floor(item.quantity);
        if (!(quantity >= 1 && quantity <= 99)) return null;
        const color = item.color || null;
        const size = item.size || null;
        // Price and options come from the product, never from the browser.
        assertVariantSelection(product.variantOptions, color, size);
        return {
          product,
          color,
          size,
          quantity,
          unitCents: unitPriceCents(product.priceCents, product.variantOptions, size),
        };
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

  const { siteUrl } = getPublicEnv();
  const stripe = getStripeClient();

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: available.map(({ product, color, size, quantity, unitCents }) => ({
      quantity,
      price_data: {
        currency: "usd",
        unit_amount: unitCents,
        product_data: {
          name: product.name,
          ...(variantLabel(color, size)
            ? { description: variantLabel(color, size) }
            : {}),
          // Carried per line so the order doesn't depend on the 500-char session metadata limit.
          metadata: {
            productId: product.id,
            color: color ?? "",
            size: size ?? "",
            unitCents: String(unitCents),
          },
        },
      },
    })),
    shipping_address_collection: { allowed_countries: SHIPPING_COUNTRIES },
    phone_number_collection: { enabled: true },
    success_url: `${siteUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${siteUrl}/cart`,
    metadata: { ventureId: input.ventureId, lineItems: "v2" },
  });

  if (!session.url) {
    throw new Error("Stripe did not return a checkout session URL.");
  }

  return session;
}

/** Cart lines for a completed checkout, read back from Stripe's line items. */
export async function readCheckoutCartItems(
  session: Stripe.Checkout.Session,
): Promise<CheckoutCartItemMetadata[]> {
  // Sessions created before variants stored the cart in session metadata.
  if (session.metadata?.cartItems) {
    return JSON.parse(session.metadata.cartItems) as CheckoutCartItemMetadata[];
  }
  const stripe = getStripeClient();
  const lines = await stripe.checkout.sessions.listLineItems(session.id, {
    limit: 100,
    expand: ["data.price.product"],
  });
  return lines.data.map((line) => {
    const product = line.price?.product as Stripe.Product | undefined;
    const meta = product?.metadata ?? {};
    if (!meta.productId) throw new ValidationError("Checkout line is missing its product.");
    return {
      productId: meta.productId,
      productName: product?.name ?? line.description ?? "Product",
      priceCentsAtPurchase: Number(meta.unitCents) || line.price?.unit_amount || 0,
      quantity: line.quantity ?? 1,
      color: meta.color || null,
      size: meta.size || null,
    };
  });
}
