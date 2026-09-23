import {
  date,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { product } from "./catalog";
import { paymentStatusEnum } from "./enums";
import { venture } from "./venture";

export const customer = pgTable(
  "customer",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ventureId: uuid("venture_id")
      .notNull()
      .references(() => venture.id, { onDelete: "restrict" }),
    email: text("email").notNull(),
    name: text("name"),
    /** Set when the shopper signs up (Supabase auth user) — see lib/domains/customers. */
    authUserId: uuid("auth_user_id").unique("customer_auth_user_unique"),
    phone: text("phone"),
    signedUpAt: timestamp("signed_up_at", { withTimezone: true }),
    /** Set by the emailed confirmation link; Skink only shows orders once it's set. */
    emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("customer_venture_email_unique").on(table.ventureId, table.email),
  ],
);

export const order = pgTable(
  "order",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ventureId: uuid("venture_id")
      .notNull()
      .references(() => venture.id, { onDelete: "restrict" }),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customer.id, { onDelete: "restrict" }),
    customerEmail: text("customer_email").notNull(),
    status: paymentStatusEnum("status").notNull().default("pending"),
    stripeCheckoutSessionId: text("stripe_checkout_session_id").notNull(),
    stripePaymentIntentId: text("stripe_payment_intent_id"),
    subtotalCents: integer("subtotal_cents").notNull(),
    totalCents: integer("total_cents").notNull(),
    currency: text("currency").notNull().default("usd"),
    shippingName: text("shipping_name"),
    shippingPhone: text("shipping_phone"),
    shippingAddress: jsonb("shipping_address").$type<{
      line1: string | null;
      line2: string | null;
      city: string | null;
      state: string | null;
      postalCode: string | null;
      country: string | null;
    }>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("order_stripe_checkout_session_unique").on(
      table.stripeCheckoutSessionId,
    ),
  ],
);

export const orderLineItem = pgTable("order_line_item", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => order.id, { onDelete: "cascade" }),
  productId: uuid("product_id")
    .notNull()
    .references(() => product.id, { onDelete: "restrict" }),
  productName: text("product_name").notNull(),
  priceCentsAtPurchase: integer("price_cents_at_purchase").notNull(),
  quantity: integer("quantity").notNull(),
  color: text("color"),
  size: text("size"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/** A signed-up customer asking the shop for something custom; the partner follows up by email. */
export const customRequest = pgTable("custom_request", {
  id: uuid("id").primaryKey().defaultRandom(),
  ventureId: uuid("venture_id")
    .notNull()
    .references(() => venture.id, { onDelete: "restrict" }),
  customerId: uuid("customer_id")
    .notNull()
    .references(() => customer.id, { onDelete: "cascade" }),
  productType: text("product_type").notNull(),
  description: text("description").notNull(),
  quantity: integer("quantity").notNull().default(1),
  neededBy: date("needed_by"),
  budget: text("budget"),
  phone: text("phone"),
  /** Object keys in the private customer-uploads bucket. */
  photoKeys: jsonb("photo_keys").$type<string[]>().notNull().default([]),
  /** new | contacted | quoted | done | declined */
  status: text("status").notNull().default("new"),
  partnerNotes: text("partner_notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
