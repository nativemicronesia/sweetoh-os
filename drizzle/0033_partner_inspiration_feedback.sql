-- Private partner-only references and an improvement inbox. These rows are
-- separate from asset/creative_library_entry by design.
CREATE TABLE partner_inspiration (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venture_id uuid NOT NULL REFERENCES venture(id) ON DELETE CASCADE,
  uploaded_by_id uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  object_key text NOT NULL UNIQUE,
  original_name text NOT NULL,
  mime_type varchar(80) NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX partner_inspiration_venture_created_idx ON partner_inspiration(venture_id, created_at DESC);
--> statement-breakpoint
ALTER TABLE partner_inspiration ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
GRANT SELECT ON partner_inspiration TO authenticated;
--> statement-breakpoint
CREATE POLICY partner_inspiration_select_own_venture ON partner_inspiration FOR SELECT TO authenticated
  USING ((is_owner() OR is_partner()) AND venture_id = (SELECT venture_id FROM app_user WHERE auth_user_id = auth.uid() AND active = true LIMIT 1));
--> statement-breakpoint
CREATE TABLE partner_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venture_id uuid NOT NULL REFERENCES venture(id) ON DELETE CASCADE,
  submitted_by_id uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  category varchar(32) NOT NULL DEFAULT 'idea' CHECK (category IN ('problem','friction','missing_capability','idea')),
  message text NOT NULL,
  page_path text,
  workflow_context text,
  created_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX partner_feedback_venture_created_idx ON partner_feedback(venture_id, created_at DESC);
--> statement-breakpoint
ALTER TABLE partner_feedback ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
GRANT SELECT ON partner_feedback TO authenticated;
--> statement-breakpoint
CREATE POLICY partner_feedback_select_own_venture ON partner_feedback FOR SELECT TO authenticated
  USING ((is_owner() OR is_partner()) AND venture_id = (SELECT venture_id FROM app_user WHERE auth_user_id = auth.uid() AND active = true LIMIT 1));
