-- Rep 5: brand fan-out + creator role + listing outbox
ALTER TYPE "public"."app_role" ADD VALUE IF NOT EXISTS 'creator';

ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "brand_venture_slug" text DEFAULT 'sweetoh' NOT NULL;
ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "submitted_by_user_id" uuid;

CREATE TABLE IF NOT EXISTS "listing_outbox" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "venture_id" uuid NOT NULL,
  "event_type" text NOT NULL,
  "payload" jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "delivered_at" timestamp with time zone
);

DO $$ BEGIN
  ALTER TABLE "listing_outbox" ADD CONSTRAINT "listing_outbox_venture_id_venture_id_fk"
    FOREIGN KEY ("venture_id") REFERENCES "public"."venture"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
