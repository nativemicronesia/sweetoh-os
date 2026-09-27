CREATE TABLE creative_library_entry (
  asset_id uuid PRIMARY KEY REFERENCES asset(id) ON DELETE CASCADE,
  venture_id uuid NOT NULL REFERENCES venture(id) ON DELETE CASCADE,
  kind varchar(32) NOT NULL CHECK (kind IN ('element','vector','sticker','pattern','texture','background','font','illustration','shape_frame','design_template','production_asset')),
  category varchar(80) NOT NULL,
  tags text[] NOT NULL DEFAULT '{}',
  production_methods text[] NOT NULL DEFAULT '{}',
  source_kind varchar(32) NOT NULL CHECK (source_kind IN ('sweetoh_original','partner_upload','licensed_external','approved_internal','legacy_unknown')),
  source_name text,
  source_url text,
  evidence_url text,
  license_id varchar(120),
  license_url text,
  commercial_use boolean NOT NULL DEFAULT false,
  modification_allowed boolean NOT NULL DEFAULT false,
  redistribution_allowed boolean NOT NULL DEFAULT false,
  attribution_required boolean NOT NULL DEFAULT false,
  attribution_text text,
  rights_verified_at timestamptz,
  rights_verified_by_id uuid REFERENCES app_user(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX creative_library_entry_venture_kind_idx ON creative_library_entry(venture_id, kind);
--> statement-breakpoint
CREATE INDEX creative_library_entry_tags_idx ON creative_library_entry USING gin(tags);
--> statement-breakpoint
ALTER TABLE creative_library_entry ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY creative_library_entry_select_owner_venture ON creative_library_entry
  FOR SELECT TO authenticated
  USING (is_owner() AND venture_id = (SELECT venture_id FROM app_user WHERE auth_user_id = auth.uid() AND active = true LIMIT 1));
