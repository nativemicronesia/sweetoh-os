CREATE TYPE "public"."studio_project_asset_role" AS ENUM('reference', 'production', 'mockup');--> statement-breakpoint
CREATE TYPE "public"."studio_project_status" AS ENUM('draft', 'in_progress', 'ready_for_review', 'approved', 'archived');--> statement-breakpoint
CREATE TABLE "studio_project" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"venture_id" uuid NOT NULL,
	"name" text NOT NULL,
	"status" "studio_project_status" DEFAULT 'draft' NOT NULL,
	"notes" text,
	"created_by_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "studio_project_asset" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"studio_project_id" uuid NOT NULL,
	"asset_id" uuid NOT NULL,
	"role" "studio_project_asset_role" NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "studio_project_asset_unique" UNIQUE("studio_project_id","asset_id","role")
);
--> statement-breakpoint
ALTER TABLE "studio_project" ADD CONSTRAINT "studio_project_venture_id_venture_id_fk" FOREIGN KEY ("venture_id") REFERENCES "public"."venture"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "studio_project" ADD CONSTRAINT "studio_project_created_by_id_app_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."app_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "studio_project_asset" ADD CONSTRAINT "studio_project_asset_studio_project_id_studio_project_id_fk" FOREIGN KEY ("studio_project_id") REFERENCES "public"."studio_project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "studio_project_asset" ADD CONSTRAINT "studio_project_asset_asset_id_asset_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."asset"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product" ADD CONSTRAINT "product_studio_project_id_studio_project_id_fk" FOREIGN KEY ("studio_project_id") REFERENCES "public"."studio_project"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE studio_project ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE studio_project_asset ENABLE ROW LEVEL SECURITY;