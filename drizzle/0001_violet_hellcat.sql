CREATE TYPE "public"."asset_authority" AS ENUM('canonical', 'derived', 'licensed');--> statement-breakpoint
CREATE TYPE "public"."asset_status" AS ENUM('draft', 'approved', 'archived', 'licensed');--> statement-breakpoint
CREATE TYPE "public"."asset_type" AS ENUM('character', 'book', 'illustration', 'sweetoh_design', 'product_asset', 'brand', 'educational', 'media', 'creator');--> statement-breakpoint
CREATE TYPE "public"."collection_kind" AS ENUM('manual', 'automatic');--> statement-breakpoint
CREATE TYPE "public"."fulfillment_type" AS ENUM('dropship', 'sweetoh', 'digital');--> statement-breakpoint
CREATE TYPE "public"."product_category" AS ENUM('baby_me', 'toys_sensory', 'sweetoh_creations', 'originals');--> statement-breakpoint
CREATE TABLE "asset" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"venture_id" uuid NOT NULL,
	"name" text NOT NULL,
	"asset_type" "asset_type" NOT NULL,
	"status" "asset_status" DEFAULT 'draft' NOT NULL,
	"authority_level" "asset_authority" DEFAULT 'canonical' NOT NULL,
	"bucket" text DEFAULT 'design-library' NOT NULL,
	"object_key" text NOT NULL,
	"mime_type" text,
	"file_size_bytes" integer,
	"uploaded_by_id" uuid,
	"approved_by_id" uuid,
	"approved_at" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "collection" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"venture_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"kind" "collection_kind" DEFAULT 'manual' NOT NULL,
	"rule_key" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "collection_venture_slug_unique" UNIQUE("venture_id","slug")
);
--> statement-breakpoint
CREATE TABLE "collection_product" (
	"collection_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "collection_product_collection_id_product_id_pk" PRIMARY KEY("collection_id","product_id")
);
--> statement-breakpoint
CREATE TABLE "product" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"venture_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"price_cents" integer DEFAULT 0 NOT NULL,
	"category" "product_category" NOT NULL,
	"fulfillment_type" "fulfillment_type" NOT NULL,
	"active" boolean DEFAULT false NOT NULL,
	"source_asset_id" uuid,
	"studio_project_id" uuid,
	"digital_asset_id" uuid,
	"supplier_sku" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_venture_slug_unique" UNIQUE("venture_id","slug")
);
--> statement-breakpoint
CREATE TABLE "product_media" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"asset_id" uuid,
	"object_key" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_event" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"venture_id" uuid NOT NULL,
	"actor_user_id" uuid,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "asset" ADD CONSTRAINT "asset_venture_id_venture_id_fk" FOREIGN KEY ("venture_id") REFERENCES "public"."venture"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset" ADD CONSTRAINT "asset_uploaded_by_id_app_user_id_fk" FOREIGN KEY ("uploaded_by_id") REFERENCES "public"."app_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset" ADD CONSTRAINT "asset_approved_by_id_app_user_id_fk" FOREIGN KEY ("approved_by_id") REFERENCES "public"."app_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection" ADD CONSTRAINT "collection_venture_id_venture_id_fk" FOREIGN KEY ("venture_id") REFERENCES "public"."venture"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_product" ADD CONSTRAINT "collection_product_collection_id_collection_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collection"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_product" ADD CONSTRAINT "collection_product_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product" ADD CONSTRAINT "product_venture_id_venture_id_fk" FOREIGN KEY ("venture_id") REFERENCES "public"."venture"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product" ADD CONSTRAINT "product_source_asset_id_asset_id_fk" FOREIGN KEY ("source_asset_id") REFERENCES "public"."asset"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_media" ADD CONSTRAINT "product_media_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_media" ADD CONSTRAINT "product_media_asset_id_asset_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."asset"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_event" ADD CONSTRAINT "audit_event_venture_id_venture_id_fk" FOREIGN KEY ("venture_id") REFERENCES "public"."venture"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_event" ADD CONSTRAINT "audit_event_actor_user_id_app_user_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."app_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "asset_venture_id_idx" ON "asset" USING btree ("venture_id");--> statement-breakpoint
CREATE INDEX "asset_status_idx" ON "asset" USING btree ("status");--> statement-breakpoint
CREATE INDEX "product_venture_id_idx" ON "product" USING btree ("venture_id");--> statement-breakpoint
CREATE INDEX "product_category_idx" ON "product" USING btree ("category");--> statement-breakpoint
CREATE INDEX "collection_venture_id_idx" ON "collection" USING btree ("venture_id");--> statement-breakpoint
CREATE INDEX "audit_event_venture_id_idx" ON "audit_event" USING btree ("venture_id");--> statement-breakpoint
CREATE INDEX "audit_event_entity_idx" ON "audit_event" USING btree ("entity_type", "entity_id");--> statement-breakpoint
CREATE TRIGGER asset_set_updated_at
  BEFORE UPDATE ON asset
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint
CREATE TRIGGER product_set_updated_at
  BEFORE UPDATE ON product
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint
CREATE TRIGGER collection_set_updated_at
  BEFORE UPDATE ON collection
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint
ALTER TABLE asset ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE product ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE product_media ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE collection ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE collection_product ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE audit_event ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY asset_select_owner_venture ON asset
  FOR SELECT TO authenticated
  USING (
    is_owner()
    AND venture_id = (SELECT venture_id FROM app_user WHERE auth_user_id = auth.uid() AND active = true LIMIT 1)
  );--> statement-breakpoint
CREATE POLICY product_select_owner_venture ON product
  FOR SELECT TO authenticated
  USING (
    is_owner()
    AND venture_id = (SELECT venture_id FROM app_user WHERE auth_user_id = auth.uid() AND active = true LIMIT 1)
  );--> statement-breakpoint
CREATE POLICY product_media_select_owner ON product_media
  FOR SELECT TO authenticated
  USING (
    is_owner()
    AND product_id IN (
      SELECT id FROM product
      WHERE venture_id = (SELECT venture_id FROM app_user WHERE auth_user_id = auth.uid() AND active = true LIMIT 1)
    )
  );--> statement-breakpoint
CREATE POLICY collection_select_owner_venture ON collection
  FOR SELECT TO authenticated
  USING (
    is_owner()
    AND venture_id = (SELECT venture_id FROM app_user WHERE auth_user_id = auth.uid() AND active = true LIMIT 1)
  );--> statement-breakpoint
CREATE POLICY collection_product_select_owner ON collection_product
  FOR SELECT TO authenticated
  USING (
    is_owner()
    AND collection_id IN (
      SELECT id FROM collection
      WHERE venture_id = (SELECT venture_id FROM app_user WHERE auth_user_id = auth.uid() AND active = true LIMIT 1)
    )
  );--> statement-breakpoint
CREATE POLICY audit_event_select_owner_venture ON audit_event
  FOR SELECT TO authenticated
  USING (
    is_owner()
    AND venture_id = (SELECT venture_id FROM app_user WHERE auth_user_id = auth.uid() AND active = true LIMIT 1)
  );