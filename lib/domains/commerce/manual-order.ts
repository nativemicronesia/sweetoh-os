import { randomUUID } from "crypto";
import { getDb } from "@/lib/db/client";
import { order, orderLineItem } from "@/lib/db/schema";
import { getProductById } from "@/lib/domains/catalog/service";
import { createFulfillmentJobsForOrder } from "@/lib/domains/fulfillment/router";
import { ValidationError } from "@/lib/shared/errors";
import { logger } from "@/lib/shared/logger";
import { findOrCreateCustomer } from "./service";

type DbClient = ReturnType<typeof getDb>;

export async function createManualOrder(input: {
  ventureId: string;
  customerEmail: string;
  customerName?: string | null;
  items: { productId: string; quantity: number }[];
}) {
  const email = input.customerEmail.trim().toLowerCase();

  if (!email) {
    throw new ValidationError("Customer email is required.");
  }

  if (input.items.length === 0) {
    throw new ValidationError("Add at least one line item.");
  }

  const lineData: {
    productId: string;
    productName: string;
    priceCentsAtPurchase: number;
    quantity: number;
  }[] = [];

  for (const item of input.items) {
    if (item.quantity < 1) {
      throw new ValidationError("Quantity must be at least 1.");
    }

    const productRow = await getProductById({
      ventureId: input.ventureId,
      productId: item.productId,
    });

    if (!productRow.active) {
      throw new ValidationError(
        `"${productRow.name}" is not published — only active products can be ordered.`,
      );
    }

    lineData.push({
      productId: productRow.id,
      productName: productRow.name,
      priceCentsAtPurchase: productRow.priceCents,
      quantity: item.quantity,
    });
  }

  const subtotalCents = lineData.reduce(
    (sum, item) => sum + item.priceCentsAtPurchase * item.quantity,
    0,
  );

  const db = getDb();

  return db.transaction(async (tx) => {
    const customerRow = await findOrCreateCustomer(
      {
        ventureId: input.ventureId,
        email,
        name: input.customerName?.trim() || null,
      },
      tx as unknown as DbClient,
    );

    const [orderRow] = await tx
      .insert(order)
      .values({
        ventureId: input.ventureId,
        customerId: customerRow.id,
        customerEmail: email,
        status: "paid",
        stripeCheckoutSessionId: `manual_${randomUUID()}`,
        stripePaymentIntentId: null,
        subtotalCents,
        totalCents: subtotalCents,
        currency: "usd",
      })
      .returning();

    if (!orderRow) {
      throw new Error("Failed to create manual order");
    }

    const lineItems = await tx
      .insert(orderLineItem)
      .values(
        lineData.map((item) => ({
          orderId: orderRow.id,
          productId: item.productId,
          productName: item.productName,
          priceCentsAtPurchase: item.priceCentsAtPurchase,
          quantity: item.quantity,
        })),
      )
      .returning();

    await createFulfillmentJobsForOrder(
      {
        ventureId: input.ventureId,
        orderId: orderRow.id,
        lineItems: lineItems.map((item) => ({
          id: item.id,
          productId: item.productId,
        })),
      },
      tx as unknown as DbClient,
    );

    logger.info("manual_order_created", {
      orderId: orderRow.id,
      ventureId: input.ventureId,
    });

    return { order: orderRow, lineItems };
  });
}
