CREATE TABLE "pil_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"venture_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"title" text NOT NULL,
	"payload" jsonb NOT NULL,
	"asset_id" uuid,
	"pie_template_id" uuid,
	"source_session_id" uuid,
	"approved_by_user_id" uuid,
	"approved_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pil_entries" ADD CONSTRAINT "pil_entries_venture_id_venture_id_fk" FOREIGN KEY ("venture_id") REFERENCES "public"."venture"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "pil_entries" ADD CONSTRAINT "pil_entries_asset_id_asset_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."asset"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "pil_entries" ADD CONSTRAINT "pil_entries_pie_template_id_pie_templates_id_fk" FOREIGN KEY ("pie_template_id") REFERENCES "public"."pie_templates"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "pil_entries" ADD CONSTRAINT "pil_entries_source_session_id_ai_creation_session_id_fk" FOREIGN KEY ("source_session_id") REFERENCES "public"."ai_creation_session"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "pil_entries" ADD CONSTRAINT "pil_entries_approved_by_user_id_app_user_id_fk" FOREIGN KEY ("approved_by_user_id") REFERENCES "public"."app_user"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "pil_entries_asset_id_active_uq" ON "pil_entries" ("asset_id") WHERE "asset_id" IS NOT NULL AND "archived_at" IS NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX "pil_entries_pie_template_id_active_uq" ON "pil_entries" ("pie_template_id") WHERE "pie_template_id" IS NOT NULL AND "archived_at" IS NULL;
--> statement-breakpoint
ALTER TABLE "pil_entries" ENABLE ROW LEVEL SECURITY;
