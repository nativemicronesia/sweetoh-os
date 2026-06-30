import { pgTable, uuid, text, jsonb, timestamp } from "drizzle-orm/pg-core";

/**
 * The Product Intelligence Library: one row per product_type, holding
 * the reusable mockup template a human defined once for that type.
 * Venture-agnostic by design -- no venture_id column. See README.md.
 */
export const productIntelligenceAssets = pgTable("product_intelligence_assets", {
  id: uuid("id").primaryKey().defaultRandom(),
  productType: text("product_type").notNull(),
  mockupBaseImageBucket: text("mockup_base_image_bucket").notNull(),
  mockupBaseImageObjectKey: text("mockup_base_image_object_key").notNull(),
  placementRegions: jsonb("placement_regions").notNull(),
  safeZones: jsonb("safe_zones").notNull(),
  printableAreas: jsonb("printable_areas").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
