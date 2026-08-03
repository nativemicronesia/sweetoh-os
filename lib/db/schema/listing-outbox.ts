import {
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { venture } from "./venture";

/**
 * Outbox for venture fan-out (Island Sprouts / NMH sites).
 * Event: product.listing.approved — consumers pull or webhook later.
 */
export const listingOutbox = pgTable("listing_outbox", {
  id: uuid("id").primaryKey().defaultRandom(),
  ventureId: uuid("venture_id")
    .notNull()
    .references(() => venture.id, { onDelete: "cascade" }),
  eventType: text("event_type").notNull(),
  payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  deliveredAt: timestamp("delivered_at", { withTimezone: true }),
});
