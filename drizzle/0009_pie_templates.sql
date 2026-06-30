CREATE TYPE "public"."pie_template_status" AS ENUM('draft', 'approved', 'archived');--> statement-breakpoint
CREATE TABLE "pie_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"venture_id" uuid NOT NULL,
	"name" text NOT NULL,
	"product_type" text,
	"template" jsonb NOT NULL,
	"source_session_id" uuid,
	"source_product_id" uuid,
	"status" "pie_template_status" DEFAULT 'draft' NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"approved_by_user_id" uuid,
	"approved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "pie_templates" ADD CONSTRAINT "pie_templates_venture_id_venture_id_fk" FOREIGN KEY ("venture_id") REFERENCES "public"."venture"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pie_templates" ADD CONSTRAINT "pie_templates_source_session_id_ai_creation_session_id_fk" FOREIGN KEY ("source_session_id") REFERENCES "public"."ai_creation_session"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pie_templates" ADD CONSTRAINT "pie_templates_source_product_id_product_id_fk" FOREIGN KEY ("source_product_id") REFERENCES "public"."product"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pie_templates" ADD CONSTRAINT "pie_templates_created_by_user_id_app_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."app_user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pie_templates" ADD CONSTRAINT "pie_templates_approved_by_user_id_app_user_id_fk" FOREIGN KEY ("approved_by_user_id") REFERENCES "public"."app_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pie_templates" ENABLE ROW LEVEL SECURITY;
