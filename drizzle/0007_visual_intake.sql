CREATE TYPE "public"."ai_session_mode" AS ENUM('text_prompt', 'visual_intake');--> statement-breakpoint
CREATE TYPE "public"."ai_session_asset_role" AS ENUM('primary', 'reference', 'brand');--> statement-breakpoint
ALTER TABLE "ai_creation_session" ADD COLUMN "mode" "ai_session_mode" DEFAULT 'text_prompt' NOT NULL;--> statement-breakpoint
ALTER TABLE "ai_creation_session" ADD COLUMN "operator_notes" text;--> statement-breakpoint
ALTER TABLE "ai_creation_session" ADD COLUMN "confidence_score" integer;--> statement-breakpoint
ALTER TABLE "ai_creation_session" ADD COLUMN "intake_detection" jsonb;--> statement-breakpoint
CREATE TABLE "ai_creation_session_asset" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"asset_id" uuid NOT NULL,
	"role" "ai_session_asset_role" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ai_creation_session_asset_session_asset_role_unique" UNIQUE("session_id","asset_id","role")
);
--> statement-breakpoint
ALTER TABLE "ai_creation_session_asset" ADD CONSTRAINT "ai_creation_session_asset_session_id_ai_creation_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."ai_creation_session"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_creation_session_asset" ADD CONSTRAINT "ai_creation_session_asset_asset_id_asset_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."asset"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_creation_session_asset" ENABLE ROW LEVEL SECURITY;
