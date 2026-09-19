ALTER TABLE "product" ADD COLUMN "variant_options" jsonb;--> statement-breakpoint
ALTER TABLE "product" ADD COLUMN "catalog_source" jsonb;--> statement-breakpoint
ALTER TABLE "product_media" ADD COLUMN "color" text;--> statement-breakpoint
ALTER TABLE "order_line_item" ADD COLUMN "color" text;--> statement-breakpoint
ALTER TABLE "order_line_item" ADD COLUMN "size" text;--> statement-breakpoint
ALTER TABLE "order" ADD COLUMN "shipping_name" text;--> statement-breakpoint
ALTER TABLE "order" ADD COLUMN "shipping_phone" text;--> statement-breakpoint
ALTER TABLE "order" ADD COLUMN "shipping_address" jsonb;
