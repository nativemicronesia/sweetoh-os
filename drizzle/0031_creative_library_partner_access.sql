-- The initial library table shipped with owner-only reads and no authenticated
-- write policy. Partners may manage metadata within their own venture; only
-- trusted server code can assert verification for external rights.
GRANT SELECT, INSERT, UPDATE ON TABLE creative_library_entry TO authenticated;
--> statement-breakpoint
DROP POLICY IF EXISTS creative_library_entry_select_owner_venture ON creative_library_entry;
--> statement-breakpoint
CREATE POLICY creative_library_entry_select_own_venture ON creative_library_entry
  FOR SELECT TO authenticated
  USING (
    (is_owner() OR is_partner())
    AND venture_id = (SELECT venture_id FROM app_user WHERE auth_user_id = auth.uid() AND active = true LIMIT 1)
  );
--> statement-breakpoint
CREATE POLICY creative_library_entry_insert_own_venture ON creative_library_entry
  FOR INSERT TO authenticated
  WITH CHECK (
    (is_owner() OR is_partner())
    AND venture_id = (SELECT venture_id FROM app_user WHERE auth_user_id = auth.uid() AND active = true LIMIT 1)
    AND (source_kind <> 'licensed_external' OR (rights_verified_at IS NULL AND rights_verified_by_id IS NULL))
  );
--> statement-breakpoint
CREATE POLICY creative_library_entry_update_own_venture ON creative_library_entry
  FOR UPDATE TO authenticated
  USING (
    (is_owner() OR is_partner())
    AND venture_id = (SELECT venture_id FROM app_user WHERE auth_user_id = auth.uid() AND active = true LIMIT 1)
  )
  WITH CHECK (
    (is_owner() OR is_partner())
    AND venture_id = (SELECT venture_id FROM app_user WHERE auth_user_id = auth.uid() AND active = true LIMIT 1)
    AND (source_kind <> 'licensed_external' OR (rights_verified_at IS NULL AND rights_verified_by_id IS NULL))
  );
