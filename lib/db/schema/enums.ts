import { pgEnum } from "drizzle-orm/pg-core";

export const productDraftStatusEnum = pgEnum("product_draft_status", [
  "draft",
  "pending_review",
  "needs_work",
  "approved",
  "published",
  "rejected",
  "archived",
]);

export const assetStatusEnum = pgEnum("asset_status", [
  "draft",
  "approved",
  "archived",
  "licensed",
]);

export const assetAuthorityEnum = pgEnum("asset_authority", [
  "canonical",
  "derived",
  "licensed",
]);

export const assetTypeEnum = pgEnum("asset_type", [
  "character",
  "book",
  "illustration",
  "sweetoh_design",
  "product_asset",
  "brand",
  "educational",
  "media",
  "creator",
]);

export const productCategoryEnum = pgEnum("product_category", [
  "baby_me",
  "toys_sensory",
  "sweetoh_creations",
  "originals",
]);

export const fulfillmentTypeEnum = pgEnum("fulfillment_type", [
  "dropship",
  "sweetoh",
  "digital",
]);

export const collectionKindEnum = pgEnum("collection_kind", [
  "manual",
  "automatic",
]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "pending",
  "paid",
  "failed",
  "refunded",
]);

export const fulfillmentPathEnum = pgEnum("fulfillment_path", [
  "dropship",
  "sweetoh",
]);

export const fulfillmentJobStatusEnum = pgEnum("fulfillment_job_status", [
  "new",
  "in_production",
  "ready_to_ship",
  "shipped",
  "delivered",
  "cancelled",
]);

export const studioProjectStatusEnum = pgEnum("studio_project_status", [
  "new",
  "reviewing",
  "approved",
  "in_production",
  "completed",
]);

export const studioProjectAssetRoleEnum = pgEnum("studio_project_asset_role", [
  "reference",
  "production",
  "mockup",
]);

export const aiSessionModeEnum = pgEnum("ai_session_mode", [
  "text_prompt",
  "visual_intake",
]);

export const aiSessionAssetRoleEnum = pgEnum("ai_session_asset_role", [
  "primary",
  "reference",
  "brand",
]);

export const pieTemplateStatusEnum = pgEnum("pie_template_status", [
  "draft",
  "approved",
  "archived",
]);
