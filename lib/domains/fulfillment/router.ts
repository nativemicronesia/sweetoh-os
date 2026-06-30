import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { fulfillmentJob, product } from "@/lib/db/schema";
import { ValidationError } from "@/lib/shared/errors";

type DbClient = ReturnType<typeof getDb>;

export async function createFulfillmentJobsForOrder(
  input: {
    ventureId: string;
    orderId: string;
    lineItems: { id: string; productId: string }[];
  },
  db: DbClient = getDb(),
) {
  const jobs = await Promise.all(
    input.lineItems.map(async (item) => {
      const [productRow] = await db
        .select({ fulfillmentType: product.fulfillmentType })
        .from(product)
        .where(eq(product.id, item.productId))
        .limit(1);

      if (!productRow) {
        throw new Error(`Product not found for line item ${item.id}`);
      }

      if (productRow.fulfillmentType === "digital") {
        throw new ValidationError(
          "Digital fulfillment is blocked at launch (ADR-002)",
        );
      }

      return {
        ventureId: input.ventureId,
        orderId: input.orderId,
        orderLineItemId: item.id,
        path: productRow.fulfillmentType,
      };
    }),
  );

  return db.insert(fulfillmentJob).values(jobs).returning();
}
