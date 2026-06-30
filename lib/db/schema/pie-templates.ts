import { jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { pieTemplateStatusEnum } from "./enums";
import { aiCreationSession } from "./intelligence";
import { appUser } from "./identity";
import { product } from "./catalog";
import { venture } from "./venture";

export type PieTemplatePayload = {
  productType?: string;
  variantSlots?: string[];
  personalizationSupported?: boolean;
  notes?: string;
};

export const pieTemplates = pgTable("pie_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  ventureId: uuid("venture_id")
    .notNull()
    .references(() => venture.id, { onDelete: "restrict" }),
  name: text("name").notNull(),
  productType: text("product_type"),
  template: jsonb("template").$type<PieTemplatePayload>().notNull(),
  sourceSessionId: uuid("source_session_id").references(
    () => aiCreationSession.id,
    { onDelete: "set null" },
  ),
  sourceProductId: uuid("source_product_id").references(() => product.id, {
    onDelete: "set null",
  }),
  status: pieTemplateStatusEnum("status").notNull().default("draft"),
  createdByUserId: uuid("created_by_user_id")
    .notNull()
    .references(() => appUser.id, { onDelete: "restrict" }),
  approvedByUserId: uuid("approved_by_user_id").references(() => appUser.id, {
    onDelete: "set null",
  }),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type PieTemplateRow = typeof pieTemplates.$inferSelect;
