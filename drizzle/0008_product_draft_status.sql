CREATE TYPE "public"."product_draft_status" AS ENUM('draft', 'pending_review', 'needs_work', 'published', 'rejected');--> statement-breakpoint
ALTER TABLE "product" ADD COLUMN "draft_status" "product_draft_status" DEFAULT 'draft' NOT NULL;--> statement-breakpoint
UPDATE "product" SET "draft_status" = 'published' WHERE "active" = true;--> statement-breakpoint
UPDATE "product" SET "draft_status" = 'pending_review' WHERE "active" = false AND "id" IN (SELECT "product_id" FROM "ai_creation_session");
