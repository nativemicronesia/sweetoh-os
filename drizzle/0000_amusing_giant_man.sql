CREATE TYPE "public"."app_role" AS ENUM('owner', 'partner');--> statement-breakpoint
CREATE TABLE "venture" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "venture_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "app_user" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"venture_id" uuid NOT NULL,
	"auth_user_id" uuid NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"role" "app_role" NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "app_user_auth_user_id_unique" UNIQUE("auth_user_id")
);
--> statement-breakpoint
ALTER TABLE "app_user" ADD CONSTRAINT "app_user_venture_id_venture_id_fk" FOREIGN KEY ("venture_id") REFERENCES "public"."venture"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "app_user_venture_id_idx" ON "app_user" USING btree ("venture_id");--> statement-breakpoint
CREATE INDEX "app_user_email_idx" ON "app_user" USING btree ("email");--> statement-breakpoint
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint
CREATE TRIGGER venture_set_updated_at
  BEFORE UPDATE ON venture
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint
CREATE TRIGGER app_user_set_updated_at
  BEFORE UPDATE ON app_user
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint
CREATE OR REPLACE FUNCTION get_current_app_user_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT id FROM app_user
  WHERE auth_user_id = auth.uid() AND active = true
  LIMIT 1;
$$;--> statement-breakpoint
CREATE OR REPLACE FUNCTION get_current_app_role()
RETURNS app_role
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT role FROM app_user
  WHERE auth_user_id = auth.uid() AND active = true
  LIMIT 1;
$$;--> statement-breakpoint
CREATE OR REPLACE FUNCTION is_active_app_user()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT get_current_app_user_id() IS NOT NULL;
$$;--> statement-breakpoint
CREATE OR REPLACE FUNCTION is_owner()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT get_current_app_role() = 'owner';
$$;--> statement-breakpoint
CREATE OR REPLACE FUNCTION is_partner()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT get_current_app_role() = 'partner';
$$;--> statement-breakpoint
ALTER TABLE venture ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE app_user ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY venture_select_own ON venture
  FOR SELECT TO authenticated
  USING (
    id = (SELECT venture_id FROM app_user WHERE auth_user_id = auth.uid() AND active = true LIMIT 1)
  );--> statement-breakpoint
CREATE POLICY app_user_select_self ON app_user
  FOR SELECT TO authenticated
  USING (auth_user_id = auth.uid());--> statement-breakpoint
CREATE POLICY app_user_select_owner_venture ON app_user
  FOR SELECT TO authenticated
  USING (
    is_owner()
    AND venture_id = (SELECT venture_id FROM app_user WHERE auth_user_id = auth.uid() AND active = true LIMIT 1)
  );