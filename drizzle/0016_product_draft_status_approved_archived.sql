ALTER TYPE "public"."product_draft_status" ADD VALUE IF NOT EXISTS 'approved';
ALTER TYPE "public"."product_draft_status" ADD VALUE IF NOT EXISTS 'archived';
