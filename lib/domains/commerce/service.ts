import { and, eq } from "drizzle-orm";
import type Stripe from "stripe";
import { getDb } from "@/lib/db/client";
import { customer, order, orderLineItem } from "@/lib/db/schema";
import { createFulfillmentJobsForOrder } from "@/lib/domains/fulfillment/router";
import { NotFoundError, ValidationError } from "@/lib/shared/errors";
import { logger } from "@/lib/shared/logger";
import type { CheckoutCartItemMetadata } from "./types";

type DbClient = ReturnType<typeof getDb>;

export async function findOrCreateCustomer(
  input: { ventureId: string; email: string; name?: string | null },
  db: DbClient = getDb(),
) {
  const [row] = await db
    .insert(customer)
    .values({
      ventureId: input.ventureId,
      email: input.email,
      name: input.name ?? null,
    })
    .onConflictDoUpdate({
      target: [customer.ventureId, customer.email],
      set: { updatedAt: new Date() },
    })
    .returning();

  if (!row) {
    throw new Error("Failed to upsert customer");
  }

  return row;
}

export async function createOrderFromCheckoutSession(session: Stripe.Checkout.Session) {
  const ventureId = session.metadata?.ventureId;
  const cartItemsRaw = session.metadata?.cartItems;

  if (!ventureId || !cartItemsRaw) {
    throw new ValidationError("Checkout session is missing required metadata.");
  }

  const cartItems: CheckoutCartItemMetadata[] = JSON.parse(cartItemsRaw);
  const email = session.customer_details?.email ?? session.customer_email;

  if (!email) {
    throw new ValidationError("Checkout session has no customer email.");
  }

  const db = getDb();

  return db.transaction(async (tx) => {
    const customerRow = await findOrCreateCustomer(
      { ventureId, email, name: session.customer_details?.name ?? null },
      tx as unknown as DbClient,
    );

    const subtotalCents = cartItems.reduce(
      (sum, item) => sum + item.priceCentsAtPurchase * item.quantity,
      0,
    );

    const paymentIntentId =
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id ?? null;

    const [orderRow] = await tx
      .insert(order)
      .values({
        ventureId,
        customerId: customerRow.id,
        customerEmail: email,
        status: "paid",
        stripeCheckoutSessionId: session.id,
        stripePaymentIntentId: paymentIntentId,
        subtotalCents,
        totalCents: session.amount_total ?? subtotalCents,
        currency: session.currency ?? "usd",
      })
      .onConflictDoNothing({ target: order.stripeCheckoutSessionId })
      .returning();

    if (!orderRow) {
      logger.info("order_webhook_duplicate", { stripeCheckoutSessionId: session.id });

      const [existing] = await tx
        .select()
        .from(order)
        .where(eq(order.stripeCheckoutSessionId, session.id))
        .limit(1);

      if (!existing) {
        throw new Error("Order insert conflicted but no existing row was found.");
      }

      const lineItems = await tx
        .select()
        .from(orderLineItem)
        .where(eq(orderLineItem.orderId, existing.id));

      return { order: existing, lineItems, isNew: false };
    }

    const lineItems = await tx
      .insert(orderLineItem)
      .values(
        cartItems.map((item) => ({
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
        ventureId,
        orderId: orderRow.id,
        lineItems: lineItems.map((item) => ({
          id: item.id,
          productId: item.productId,
        })),
      },
      tx as unknown as DbClient,
    );

    logger.info("order_created", { orderId: orderRow.id, ventureId });

    return { order: orderRow, lineItems, isNew: true };
  });
}

export async function getOrderByCheckoutSessionId(input: {
  ventureId: string;
  sessionId: string;
}) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(order)
    .where(
      and(
        eq(order.ventureId, input.ventureId),
        eq(order.stripeCheckoutSessionId, input.sessionId),
      ),
    )
    .limit(1);

  if (!row) {
    throw new NotFoundError("Order not found");
  }

  const lineItems = await db
    .select()
    .from(orderLineItem)
    .where(eq(orderLineItem.orderId, row.id));

  return { order: row, lineItems };
}

export async function listOrders(ventureId: string) {
  const db = getDb();

  return db
    .select()
    .from(order)
    .where(eq(order.ventureId, ventureId))
    .orderBy(order.createdAt);
}

export async function getOrderWithLineItems(input: {
  ventureId: string;
  orderId: string;
}) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(order)
    .where(and(eq(order.id, input.orderId), eq(order.ventureId, input.ventureId)))
    .limit(1);

  if (!row) {
    throw new NotFoundError("Order not found");
  }

  const lineItems = await db
    .select()
    .from(orderLineItem)
    .where(eq(orderLineItem.orderId, row.id));

  return { order: row, lineItems };
}
