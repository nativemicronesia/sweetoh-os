import { integer, jsonb, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { asset } from "./asset";
import { aiSessionAssetRoleEnum, aiSessionModeEnum } from "./enums";
import { appUser } from "./identity";
import { product } from "./catalog";
import { venture } from "./venture";

export type IntakeDetection = {
  productType?: string;
  colors?: string[];
  materials?: string[];
  dimensions?: string;
  variants?: string[];
};

export const aiCreationSession = pgTable("ai_creation_session", {
  id: uuid("id").primaryKey().defaultRandom(),
  ventureId: uuid("venture_id")
    .notNull()
    .references(() => venture.id, { onDelete: "restrict" }),
  actorUserId: uuid("actor_user_id")
    .notNull()
    .references(() => appUser.id, { onDelete: "restrict" }),
  mode: aiSessionModeEnum("mode").notNull().default("text_prompt"),
  prompt: text("prompt").notNull(),
  operatorNotes: text("operator_notes"),
  confidenceScore: integer("confidence_score"),
  intakeDetection: jsonb("intake_detection").$type<IntakeDetection>(),
  pieOutput: jsonb("pie_output"),
  productId: uuid("product_id")
    .notNull()
    .references(() => product.id, { onDelete: "cascade" }),
  rawResponse: jsonb("raw_response").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const aiCreationSessionAsset = pgTable(
  "ai_creation_session_asset",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => aiCreationSession.id, { onDelete: "cascade" }),
    assetId: uuid("asset_id")
      .notNull()
      .references(() => asset.id, { onDelete: "cascade" }),
    role: aiSessionAssetRoleEnum("role").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("ai_creation_session_asset_session_asset_role_unique").on(
      table.sessionId,
      table.assetId,
      table.role,
    ),
  ],
);
