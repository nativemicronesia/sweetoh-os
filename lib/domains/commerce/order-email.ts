import { and, eq, inArray } from "drizzle-orm";
import {
  getIslandSproutsSupportEmail,
  getSweetohSupportEmail,
} from "@/lib/config/env";
import { getDb } from "@/lib/db/client";
import { product } from "@/lib/db/schema";

/** Reply-to for store order confirmations — Sweet'Oh-only carts use Sweet'Oh support. */
export function resolveOrderConfirmationReplyTo(
  productCategories: string[],
): string | undefined {
  if (productCategories.length === 0) {
    return getIslandSproutsSupportEmail();
  }

  const allSweetoh = productCategories.every(
    (category) => category === "sweetoh_creations",
  );

  return allSweetoh
    ? getSweetohSupportEmail()
    : getIslandSproutsSupportEmail();
}

export async function getOrderConfirmationReplyToForProducts(input: {
  ventureId: string;
  productIds: string[];
}): Promise<string | undefined> {
  if (input.productIds.length === 0) {
    return getIslandSproutsSupportEmail();
  }

  const db = getDb();
  const rows = await db
    .select({ category: product.category })
    .from(product)
    .where(
      and(
        eq(product.ventureId, input.ventureId),
        inArray(product.id, input.productIds),
      ),
    );

  return resolveOrderConfirmationReplyTo(rows.map((row) => row.category));
}
