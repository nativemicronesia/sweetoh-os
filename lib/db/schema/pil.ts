import { jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { asset } from "./asset";
import { product } from "./catalog";
import { aiCreationSession } from "./intelligence";
import { appUser } from "./identity";
import { pieTemplates } from "./pie-templates";
import { venture } from "./venture";

export type PilEntryKind = "asset" | "template" | "product";

export const pilEntries = pgTable("pil_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  ventureId: uuid("venture_id")
    .notNull()
    .references(() => venture.id, { onDelete: "restrict" }),
  kind: text("kind").$type<PilEntryKind>().notNull(),
  title: text("title").notNull(),
  payload: jsonb("payload").notNull(),
  assetId: uuid("asset_id").references(() => asset.id, { onDelete: "set null" }),
  pieTemplateId: uuid("pie_template_id").references(() => pieTemplates.id, {
    onDelete: "set null",
  }),
  productId: uuid("product_id").references(() => product.id, {
    onDelete: "set null",
  }),
  sourceSessionId: uuid("source_session_id").references(
    () => aiCreationSession.id,
    { onDelete: "set null" },
  ),
  approvedByUserId: uuid("approved_by_user_id").references(() => appUser.id, {
    onDelete: "set null",
  }),
  approvedAt: timestamp("approved_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type PilEntryRow = typeof pilEntries.$inferSelect;
