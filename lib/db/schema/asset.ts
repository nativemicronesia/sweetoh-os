import {
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { appUser } from "./identity";
import {
  assetAuthorityEnum,
  assetStatusEnum,
  assetTypeEnum,
} from "./enums";
import { venture } from "./venture";

export const asset = pgTable("asset", {
  id: uuid("id").primaryKey().defaultRandom(),
  ventureId: uuid("venture_id")
    .notNull()
    .references(() => venture.id, { onDelete: "restrict" }),
  name: text("name").notNull(),
  assetType: assetTypeEnum("asset_type").notNull(),
  status: assetStatusEnum("status").notNull().default("draft"),
  authorityLevel: assetAuthorityEnum("authority_level")
    .notNull()
    .default("canonical"),
  bucket: text("bucket").notNull().default("design-library"),
  objectKey: text("object_key").notNull(),
  mimeType: text("mime_type"),
  fileSizeBytes: integer("file_size_bytes"),
  uploadedById: uuid("uploaded_by_id").references(() => appUser.id, {
    onDelete: "set null",
  }),
  approvedById: uuid("approved_by_id").references(() => appUser.id, {
    onDelete: "set null",
  }),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
