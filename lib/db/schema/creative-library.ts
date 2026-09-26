import { boolean, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { appUser } from "./identity";
import { venture } from "./venture";
import { asset } from "./asset";

/** Rights and discovery metadata for an existing asset row; asset remains the file/ownership authority. */
export const creativeLibraryEntry = pgTable("creative_library_entry", {
  assetId: uuid("asset_id").primaryKey().references(() => asset.id, { onDelete: "cascade" }),
  ventureId: uuid("venture_id").notNull().references(() => venture.id, { onDelete: "cascade" }),
  kind: varchar("kind", { length: 32 }).notNull(),
  category: varchar("category", { length: 80 }).notNull(),
  tags: text("tags").array().notNull().default([]),
  productionMethods: text("production_methods").array().notNull().default([]),
  sourceKind: varchar("source_kind", { length: 32 }).notNull(),
  sourceName: text("source_name"),
  sourceUrl: text("source_url"),
  evidenceUrl: text("evidence_url"),
  licenseId: varchar("license_id", { length: 120 }),
  licenseUrl: text("license_url"),
  commercialUse: boolean("commercial_use").notNull().default(false),
  modificationAllowed: boolean("modification_allowed").notNull().default(false),
  redistributionAllowed: boolean("redistribution_allowed").notNull().default(false),
  attributionRequired: boolean("attribution_required").notNull().default(false),
  attributionText: text("attribution_text"),
  rightsVerifiedAt: timestamp("rights_verified_at", { withTimezone: true }),
  rightsVerifiedById: uuid("rights_verified_by_id").references(() => appUser.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
