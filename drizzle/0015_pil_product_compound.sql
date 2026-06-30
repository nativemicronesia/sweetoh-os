ALTER TABLE "pil_entries" ADD COLUMN IF NOT EXISTS "product_id" uuid;

ALTER TABLE "pil_entries" DROP CONSTRAINT IF EXISTS "pil_entries_product_id_product_id_fk";

ALTER TABLE "pil_entries" ADD CONSTRAINT "pil_entries_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE set null ON UPDATE no action;

CREATE UNIQUE INDEX IF NOT EXISTS "pil_entries_product_id_active_uq" ON "pil_entries" ("product_id") WHERE "product_id" IS NOT NULL AND "archived_at" IS NULL;
