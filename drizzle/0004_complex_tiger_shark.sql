CREATE TYPE "public"."fulfillment_job_status" AS ENUM('new', 'in_production', 'ready_to_ship', 'shipped', 'delivered', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."fulfillment_path" AS ENUM('dropship', 'sweetoh');--> statement-breakpoint
CREATE TABLE "fulfillment_event" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"fulfillment_job_id" uuid NOT NULL,
	"status" "fulfillment_job_status" NOT NULL,
	"note" text,
	"actor_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fulfillment_job" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"venture_id" uuid NOT NULL,
	"order_id" uuid NOT NULL,
	"order_line_item_id" uuid NOT NULL,
	"path" "fulfillment_path" NOT NULL,
	"status" "fulfillment_job_status" DEFAULT 'new' NOT NULL,
	"assigned_partner_user_id" uuid,
	"digital_delivery_asset_id" uuid,
	"tracking_number" text,
	"tracking_url" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "fulfillment_event" ADD CONSTRAINT "fulfillment_event_fulfillment_job_id_fulfillment_job_id_fk" FOREIGN KEY ("fulfillment_job_id") REFERENCES "public"."fulfillment_job"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fulfillment_event" ADD CONSTRAINT "fulfillment_event_actor_user_id_app_user_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."app_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fulfillment_job" ADD CONSTRAINT "fulfillment_job_venture_id_venture_id_fk" FOREIGN KEY ("venture_id") REFERENCES "public"."venture"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fulfillment_job" ADD CONSTRAINT "fulfillment_job_order_id_order_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."order"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fulfillment_job" ADD CONSTRAINT "fulfillment_job_order_line_item_id_order_line_item_id_fk" FOREIGN KEY ("order_line_item_id") REFERENCES "public"."order_line_item"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fulfillment_job" ADD CONSTRAINT "fulfillment_job_assigned_partner_user_id_app_user_id_fk" FOREIGN KEY ("assigned_partner_user_id") REFERENCES "public"."app_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE fulfillment_event ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE fulfillment_job ENABLE ROW LEVEL SECURITY;