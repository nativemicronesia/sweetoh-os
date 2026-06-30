CREATE TABLE "email_signup" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"venture_id" uuid NOT NULL,
	"email" text NOT NULL,
	"source" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "email_signup_venture_email_unique" UNIQUE("venture_id","email")
);
--> statement-breakpoint
ALTER TABLE "email_signup" ADD CONSTRAINT "email_signup_venture_id_venture_id_fk" FOREIGN KEY ("venture_id") REFERENCES "public"."venture"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE email_signup ENABLE ROW LEVEL SECURITY;