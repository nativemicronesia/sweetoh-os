CREATE TABLE "product_intelligence_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_type" text NOT NULL,
	"mockup_base_image_bucket" text NOT NULL,
	"mockup_base_image_object_key" text NOT NULL,
	"placement_regions" jsonb NOT NULL,
	"safe_zones" jsonb NOT NULL,
	"printable_areas" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

-- RLS: this table is venture-agnostic and read/written only by
-- server-side code via the service role (see ../../storage/client.ts
-- and ../client.ts), never by an end-user session. RLS is enabled
-- with no permissive policies -- locked to service role, which
-- bypasses RLS in Supabase by design. No anon/authenticated access.
ALTER TABLE "product_intelligence_assets" ENABLE ROW LEVEL SECURITY;
