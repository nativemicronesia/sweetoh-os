import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { appUser } from "./identity";
import { asset } from "./asset";
import { venture } from "./venture";

/**
 * Create with Sweet'Oh — one row per creator. Each creator also owns a private
 * `venture` (their workspace), so every existing ventureId-scoped query keeps
 * their designs, blanks and uploads isolated from other creators and from the
 * Sweet'Oh shop.
 */
export const creatorProfile = pgTable("creator_profile", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => appUser.id, { onDelete: "cascade" }),
  ventureId: uuid("venture_id")
    .notNull()
    .references(() => venture.id, { onDelete: "restrict" }),
  /** free | creator | pro */
  plan: text("plan").notNull().default("free"),
  /** none | active | past_due | canceled */
  planStatus: text("plan_status").notNull().default("none"),
  /** month | year */
  billingInterval: text("billing_interval"),
  founding: boolean("founding").notNull().default(false),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
  /** AES-GCM encrypted Printify personal access token (creator's own account). */
  printifyTokenEnc: text("printify_token_enc"),
  printifyShopId: text("printify_shop_id"),
  printifyShopTitle: text("printify_shop_title"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Credits = AI capacity. 1 credit ≈ $0.01 of raw provider cost. Balance = sum(delta). */
export const creditLedger = pgTable(
  "credit_ledger",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => appUser.id, { onDelete: "cascade" }),
    delta: numeric("delta", { precision: 12, scale: 3 }).notNull(),
    /** grant | usage | topup | adjustment */
    kind: text("kind").notNull(),
    reason: text("reason").notNull(),
    /** Idempotency key: monthly grants, Stripe events. */
    dedupeKey: text("dedupe_key"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("credit_ledger_dedupe_unique").on(t.userId, t.dedupeKey),
    index("credit_ledger_user_idx").on(t.userId, t.createdAt),
  ],
);

/** Conversation with Skink — kept separate from durable memory. */
export const skinkThread = pgTable(
  "skink_thread",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => appUser.id, { onDelete: "cascade" }),
    title: text("title").notNull().default("New chat"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("skink_thread_user_idx").on(t.userId, t.updatedAt)],
);

export const skinkMessage = pgTable(
  "skink_message",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    threadId: uuid("thread_id")
      .notNull()
      .references(() => skinkThread.id, { onDelete: "cascade" }),
    /** user | assistant */
    role: text("role").notNull(),
    content: text("content").notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("skink_message_thread_idx").on(t.threadId, t.createdAt)],
);

/**
 * Durable private intelligence about one creator — not chat history.
 * kind: brand | project | preference | goal | decision | asset | experiment | correction | fact
 */
export const creatorMemory = pgTable(
  "creator_memory",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => appUser.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull().default(""),
    /** skink | creator */
    source: text("source").notNull().default("skink"),
    pinned: boolean("pinned").notNull().default(false),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("creator_memory_user_idx").on(t.userId, t.updatedAt)],
);

export type PrintRequestItems = {
  lines: { color?: string | null; size?: string | null; quantity: number }[];
  /** Transparent print files (assets in the creator's workspace). */
  files: { assetId: string; surface: string; position: string; width: number; height: number }[];
  blueprintId?: number | null;
  productLabel?: string | null;
};

/** A creator asking the Sweet'Oh shop to print a saved design. */
export const printRequest = pgTable(
  "print_request",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** The Sweet'Oh shop venture that receives the request. */
    shopVentureId: uuid("shop_venture_id")
      .notNull()
      .references(() => venture.id, { onDelete: "restrict" }),
    creatorUserId: uuid("creator_user_id")
      .notNull()
      .references(() => appUser.id, { onDelete: "cascade" }),
    creatorVentureId: uuid("creator_venture_id")
      .notNull()
      .references(() => venture.id, { onDelete: "restrict" }),
    compositionAssetId: uuid("composition_asset_id")
      .notNull()
      .references(() => asset.id, { onDelete: "restrict" }),
    productName: text("product_name").notNull(),
    quantity: integer("quantity").notNull(),
    /** What to print and the production files the creator's Studio exported. */
    items: jsonb("items").$type<PrintRequestItems>(),
    creatorNote: text("creator_note"),
    shipTo: text("ship_to"),
    /** new | quoted | declined | paid | in_production | shipped | canceled */
    status: text("status").notNull().default("new"),
    quoteCents: integer("quote_cents"),
    partnerNote: text("partner_note"),
    stripeSessionId: text("stripe_session_id"),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("print_request_shop_idx").on(t.shopVentureId, t.status, t.createdAt),
    index("print_request_creator_idx").on(t.creatorUserId, t.createdAt),
  ],
);

/** Per-shop switches the partner controls. */
export const shopSetting = pgTable("shop_setting", {
  ventureId: uuid("venture_id")
    .primaryKey()
    .references(() => venture.id, { onDelete: "cascade" }),
  acceptingCreatorRequests: boolean("accepting_creator_requests").notNull().default(true),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Anonymous Skink usage (hashed IP per day) so visitors can't run up costs. */
export const skinkVisitorUsage = pgTable(
  "skink_visitor_usage",
  {
    key: text("key").notNull(),
    day: text("day").notNull(),
    count: integer("count").notNull().default(0),
  },
  (t) => [unique("skink_visitor_usage_unique").on(t.key, t.day)],
);
