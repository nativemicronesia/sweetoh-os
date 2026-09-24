-- Shop inbox: every email sent to @sweetohcreations.shop lands here (via the
-- Resend receiving webhook) and is forwarded to the partner's Gmail. Replies
-- sent from the back office are stored on the same thread. Additive only.
CREATE TABLE IF NOT EXISTS "inbox_thread" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "venture_id" uuid NOT NULL REFERENCES "venture"("id") ON DELETE restrict,
  "subject" text NOT NULL,
  "counterpart_email" text NOT NULL,
  "counterpart_name" text,
  "category" text DEFAULT 'other' NOT NULL,
  "customer_id" uuid REFERENCES "customer"("id") ON DELETE set null,
  "message_count" integer DEFAULT 0 NOT NULL,
  "last_message_at" timestamp with time zone DEFAULT now() NOT NULL,
  "unread" boolean DEFAULT true NOT NULL,
  "starred" boolean DEFAULT false NOT NULL,
  "spam" boolean DEFAULT false NOT NULL,
  "archived_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inbox_thread_venture_idx" ON "inbox_thread" ("venture_id","archived_at","last_message_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inbox_thread_counterpart_idx" ON "inbox_thread" ("venture_id","counterpart_email");--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "inbox_message" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "venture_id" uuid NOT NULL REFERENCES "venture"("id") ON DELETE restrict,
  "thread_id" uuid NOT NULL REFERENCES "inbox_thread"("id") ON DELETE cascade,
  "direction" text NOT NULL,
  "resend_email_id" text,
  "message_id" text,
  "in_reply_to" text,
  "from_email" text NOT NULL,
  "from_name" text,
  "to_emails" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "cc_emails" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "subject" text NOT NULL,
  "text_body" text,
  "html_body" text,
  "snippet" text,
  "attachments" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "authentication" jsonb,
  "forwarded_at" timestamp with time zone,
  "forward_error" text,
  "sent_by_user_id" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "inbox_message_resend_unique" ON "inbox_message" ("resend_email_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inbox_message_thread_idx" ON "inbox_message" ("thread_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inbox_message_message_id_idx" ON "inbox_message" ("venture_id","message_id");
