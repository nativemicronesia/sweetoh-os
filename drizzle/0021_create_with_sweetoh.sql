CREATE TABLE IF NOT EXISTS "creator_profile" (
  "user_id" uuid PRIMARY KEY NOT NULL REFERENCES "app_user"("id") ON DELETE cascade,
  "venture_id" uuid NOT NULL REFERENCES "venture"("id") ON DELETE restrict,
  "plan" text DEFAULT 'free' NOT NULL,
  "plan_status" text DEFAULT 'none' NOT NULL,
  "billing_interval" text,
  "founding" boolean DEFAULT false NOT NULL,
  "stripe_customer_id" text,
  "stripe_subscription_id" text,
  "current_period_end" timestamp with time zone,
  "printify_token_enc" text,
  "printify_shop_id" text,
  "printify_shop_title" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "credit_ledger" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "app_user"("id") ON DELETE cascade,
  "delta" numeric(12, 3) NOT NULL,
  "kind" text NOT NULL,
  "reason" text NOT NULL,
  "dedupe_key" text,
  "metadata" jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "credit_ledger_dedupe_unique" UNIQUE("user_id","dedupe_key")
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "credit_ledger_user_idx" ON "credit_ledger" ("user_id","created_at");--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "skink_thread" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "app_user"("id") ON DELETE cascade,
  "title" text DEFAULT 'New chat' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "skink_thread_user_idx" ON "skink_thread" ("user_id","updated_at");--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "skink_message" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "thread_id" uuid NOT NULL REFERENCES "skink_thread"("id") ON DELETE cascade,
  "role" text NOT NULL,
  "content" text NOT NULL,
  "metadata" jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "skink_message_thread_idx" ON "skink_message" ("thread_id","created_at");--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "creator_memory" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "app_user"("id") ON DELETE cascade,
  "kind" text NOT NULL,
  "title" text NOT NULL,
  "body" text DEFAULT '' NOT NULL,
  "source" text DEFAULT 'skink' NOT NULL,
  "pinned" boolean DEFAULT false NOT NULL,
  "archived_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "creator_memory_user_idx" ON "creator_memory" ("user_id","updated_at");--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "print_request" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "shop_venture_id" uuid NOT NULL REFERENCES "venture"("id") ON DELETE restrict,
  "creator_user_id" uuid NOT NULL REFERENCES "app_user"("id") ON DELETE cascade,
  "creator_venture_id" uuid NOT NULL REFERENCES "venture"("id") ON DELETE restrict,
  "composition_asset_id" uuid NOT NULL REFERENCES "asset"("id") ON DELETE restrict,
  "product_name" text NOT NULL,
  "quantity" integer NOT NULL,
  "items" jsonb,
  "creator_note" text,
  "ship_to" text,
  "status" text DEFAULT 'new' NOT NULL,
  "quote_cents" integer,
  "partner_note" text,
  "stripe_session_id" text,
  "paid_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "print_request_shop_idx" ON "print_request" ("shop_venture_id","status","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "print_request_creator_idx" ON "print_request" ("creator_user_id","created_at");--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "shop_setting" (
  "venture_id" uuid PRIMARY KEY NOT NULL REFERENCES "venture"("id") ON DELETE cascade,
  "accepting_creator_requests" boolean DEFAULT true NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "skink_visitor_usage" (
  "key" text NOT NULL,
  "day" text NOT NULL,
  "count" integer DEFAULT 0 NOT NULL,
  CONSTRAINT "skink_visitor_usage_unique" UNIQUE("key","day")
);--> statement-breakpoint
ALTER TABLE creator_profile ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE credit_ledger ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE skink_thread ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE skink_message ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE creator_memory ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE print_request ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE shop_setting ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE skink_visitor_usage ENABLE ROW LEVEL SECURITY;
