import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { appUser } from "./identity";
import { order, orderLineItem } from "./commerce";
import { fulfillmentJobStatusEnum, fulfillmentPathEnum } from "./enums";
import { venture } from "./venture";

export const fulfillmentJob = pgTable("fulfillment_job", {
  id: uuid("id").primaryKey().defaultRandom(),
  ventureId: uuid("venture_id")
    .notNull()
    .references(() => venture.id, { onDelete: "restrict" }),
  orderId: uuid("order_id")
    .notNull()
    .references(() => order.id, { onDelete: "cascade" }),
  orderLineItemId: uuid("order_line_item_id")
    .notNull()
    .references(() => orderLineItem.id, { onDelete: "cascade" }),
  path: fulfillmentPathEnum("path").notNull(),
  status: fulfillmentJobStatusEnum("status").notNull().default("new"),
  assignedPartnerUserId: uuid("assigned_partner_user_id").references(
    () => appUser.id,
    { onDelete: "set null" },
  ),
  digitalDeliveryAssetId: uuid("digital_delivery_asset_id"),
  trackingNumber: text("tracking_number"),
  trackingUrl: text("tracking_url"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const fulfillmentEvent = pgTable("fulfillment_event", {
  id: uuid("id").primaryKey().defaultRandom(),
  fulfillmentJobId: uuid("fulfillment_job_id")
    .notNull()
    .references(() => fulfillmentJob.id, { onDelete: "cascade" }),
  status: fulfillmentJobStatusEnum("status").notNull(),
  note: text("note"),
  actorUserId: uuid("actor_user_id").references(() => appUser.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
