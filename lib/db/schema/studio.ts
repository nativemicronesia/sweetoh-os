import {
  integer,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { appUser } from "./identity";
import { asset } from "./asset";
import { studioProjectAssetRoleEnum, studioProjectStatusEnum } from "./enums";
import { venture } from "./venture";

export const studioProject = pgTable("studio_project", {
  id: uuid("id").primaryKey().defaultRandom(),
  ventureId: uuid("venture_id")
    .notNull()
    .references(() => venture.id, { onDelete: "restrict" }),
  name: text("name").notNull(),
  status: studioProjectStatusEnum("status").notNull().default("new"),
  notes: text("notes"),
  internalNotes: text("internal_notes"),
  customerEmail: text("customer_email"),
  customerName: text("customer_name"),
  createdById: uuid("created_by_id").references(() => appUser.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const studioProjectAsset = pgTable(
  "studio_project_asset",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    studioProjectId: uuid("studio_project_id")
      .notNull()
      .references(() => studioProject.id, { onDelete: "cascade" }),
    assetId: uuid("asset_id")
      .notNull()
      .references(() => asset.id, { onDelete: "cascade" }),
    role: studioProjectAssetRoleEnum("role").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (table) => [
    unique("studio_project_asset_unique").on(
      table.studioProjectId,
      table.assetId,
      table.role,
    ),
  ],
);
