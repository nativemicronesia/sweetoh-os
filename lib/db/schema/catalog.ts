import {
  boolean,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { asset } from "./asset";
import {
  collectionKindEnum,
  fulfillmentTypeEnum,
  productCategoryEnum,
  productDraftStatusEnum,
} from "./enums";
import { studioProject } from "./studio";
import { venture } from "./venture";

export const product = pgTable(
  "product",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ventureId: uuid("venture_id")
      .notNull()
      .references(() => venture.id, { onDelete: "restrict" }),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    priceCents: integer("price_cents").notNull().default(0),
    category: productCategoryEnum("category").notNull(),
    fulfillmentType: fulfillmentTypeEnum("fulfillment_type").notNull(),
    active: boolean("active").notNull().default(false),
    draftStatus: productDraftStatusEnum("draft_status")
      .notNull()
      .default("draft"),
    sourceAssetId: uuid("source_asset_id").references(() => asset.id, {
      onDelete: "set null",
    }),
    studioProjectId: uuid("studio_project_id").references(
      () => studioProject.id,
      { onDelete: "set null" },
    ),
    digitalAssetId: uuid("digital_asset_id"),
    supplierSku: text("supplier_sku"),
    shortDescription: text("short_description"),
    seoTitle: text("seo_title"),
    seoDescription: text("seo_description"),
    internalNotes: text("internal_notes"),
    suggestedTags: jsonb("suggested_tags").$type<string[]>(),
    suggestedCollections: jsonb("suggested_collections").$type<string[]>(),
    /**
     * Brand catalog this product belongs to when approved (sweetoh, island-sprouts, nmh…).
     * Producing venture stays ventureId (Sweet'Oh POD). Fan-out uses this slug.
     */
    brandVentureSlug: text("brand_venture_slug").notNull().default("sweetoh"),
    submittedByUserId: uuid("submitted_by_user_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [unique("product_venture_slug_unique").on(table.ventureId, table.slug)],
);

export const productMedia = pgTable("product_media", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id")
    .notNull()
    .references(() => product.id, { onDelete: "cascade" }),
  assetId: uuid("asset_id").references(() => asset.id, {
    onDelete: "set null",
  }),
  objectKey: text("object_key"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const collection = pgTable(
  "collection",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ventureId: uuid("venture_id")
      .notNull()
      .references(() => venture.id, { onDelete: "restrict" }),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    kind: collectionKindEnum("kind").notNull().default("manual"),
    ruleKey: text("rule_key"),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("collection_venture_slug_unique").on(table.ventureId, table.slug),
  ],
);

export const collectionProduct = pgTable(
  "collection_product",
  {
    collectionId: uuid("collection_id")
      .notNull()
      .references(() => collection.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => product.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (table) => [
    primaryKey({ columns: [table.collectionId, table.productId] }),
  ],
);
