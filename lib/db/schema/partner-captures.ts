import { pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { appUser } from "./identity";
import { venture } from "./venture";

/** Private references are intentionally not assets and can never enter Studio/library retrieval. */
export const partnerInspiration = pgTable("partner_inspiration", {
  id: uuid("id").primaryKey().defaultRandom(),
  ventureId: uuid("venture_id").notNull().references(() => venture.id, { onDelete: "cascade" }),
  uploadedById: uuid("uploaded_by_id").notNull().references(() => appUser.id, { onDelete: "cascade" }),
  objectKey: text("object_key").notNull().unique(),
  originalName: text("original_name").notNull(),
  mimeType: varchar("mime_type", { length: 80 }).notNull(),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Improvement inbox only: normal app data, never a chat or AI request. */
export const partnerFeedback = pgTable("partner_feedback", {
  id: uuid("id").primaryKey().defaultRandom(),
  ventureId: uuid("venture_id").notNull().references(() => venture.id, { onDelete: "cascade" }),
  submittedById: uuid("submitted_by_id").notNull().references(() => appUser.id, { onDelete: "cascade" }),
  category: varchar("category", { length: 32 }).notNull().default("idea"),
  message: text("message").notNull(),
  pagePath: text("page_path"),
  workflowContext: text("workflow_context"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
