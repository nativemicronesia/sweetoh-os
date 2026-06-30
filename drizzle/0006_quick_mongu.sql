CREATE TABLE "ai_creation_session" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"venture_id" uuid NOT NULL,
	"actor_user_id" uuid NOT NULL,
	"prompt" text NOT NULL,
	"product_id" uuid NOT NULL,
	"raw_response" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "product" ADD COLUMN "short_description" text;--> statement-breakpoint
ALTER TABLE "product" ADD COLUMN "seo_title" text;--> statement-breakpoint
ALTER TABLE "product" ADD COLUMN "seo_description" text;--> statement-breakpoint
ALTER TABLE "product" ADD COLUMN "internal_notes" text;--> statement-breakpoint
ALTER TABLE "product" ADD COLUMN "suggested_tags" jsonb;--> statement-breakpoint
ALTER TABLE "product" ADD COLUMN "suggested_collections" jsonb;--> statement-breakpoint
ALTER TABLE "ai_creation_session" ADD CONSTRAINT "ai_creation_session_venture_id_venture_id_fk" FOREIGN KEY ("venture_id") REFERENCES "public"."venture"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_creation_session" ADD CONSTRAINT "ai_creation_session_actor_user_id_app_user_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."app_user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_creation_session" ADD CONSTRAINT "ai_creation_session_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE ai_creation_session ENABLE ROW LEVEL SECURITY;