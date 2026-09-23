-- Launch: shop customers can sign up (no dashboard) to send custom requests,
-- and Skink can answer "where's my order" for them. Additive only.
ALTER TABLE "customer" ADD COLUMN IF NOT EXISTS "auth_user_id" uuid;--> statement-breakpoint
ALTER TABLE "customer" ADD COLUMN IF NOT EXISTS "phone" text;--> statement-breakpoint
ALTER TABLE "customer" ADD COLUMN IF NOT EXISTS "signed_up_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "customer" ADD COLUMN IF NOT EXISTS "email_verified_at" timestamp with time zone;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "customer_auth_user_unique" ON "customer" ("auth_user_id");--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "custom_request" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "venture_id" uuid NOT NULL REFERENCES "venture"("id") ON DELETE restrict,
  "customer_id" uuid NOT NULL REFERENCES "customer"("id") ON DELETE cascade,
  "product_type" text NOT NULL,
  "description" text NOT NULL,
  "quantity" integer DEFAULT 1 NOT NULL,
  "needed_by" date,
  "budget" text,
  "phone" text,
  "photo_keys" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "status" text DEFAULT 'new' NOT NULL,
  "partner_notes" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "custom_request_venture_idx" ON "custom_request" ("venture_id","status","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "custom_request_customer_idx" ON "custom_request" ("customer_id","created_at");
