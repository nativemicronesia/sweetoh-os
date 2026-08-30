-- POD shop taxonomy: replace Island Sprouts–era categories with printable families.
CREATE TYPE "public"."product_category_pod" AS ENUM(
  'apparel',
  'kids',
  'home',
  'drinkware',
  'accessories',
  'custom'
);--> statement-breakpoint

ALTER TABLE "product" ALTER COLUMN "category" DROP DEFAULT;--> statement-breakpoint

ALTER TABLE "product"
  ALTER COLUMN "category" TYPE "public"."product_category_pod"
  USING (
    CASE "category"::text
      WHEN 'baby_me' THEN 'kids'
      WHEN 'toys_sensory' THEN 'kids'
      WHEN 'apparel' THEN 'apparel'
      WHEN 'kids' THEN 'kids'
      WHEN 'home' THEN 'home'
      WHEN 'drinkware' THEN 'drinkware'
      WHEN 'accessories' THEN 'accessories'
      WHEN 'sweetoh_creations' THEN 'custom'
      WHEN 'originals' THEN 'custom'
      WHEN 'custom' THEN 'custom'
      ELSE 'custom'
    END
  )::"public"."product_category_pod";--> statement-breakpoint

DROP TYPE "public"."product_category";--> statement-breakpoint

ALTER TYPE "public"."product_category_pod" RENAME TO "product_category";--> statement-breakpoint

UPDATE "collection"
SET "active" = false, "updated_at" = now()
WHERE "slug" IN (
  'baby-me',
  'toys-and-sensory',
  'sweetoh-creations',
  'island-sprouts-originals'
);--> statement-breakpoint
