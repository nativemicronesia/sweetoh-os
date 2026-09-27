-- Library writes go through the server service, which validates venture
-- ownership and keeps external rights verification behind the review action.
-- Authenticated clients get read-only access to their own venture's entries.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLE creative_library_entry FROM PUBLIC, anon, authenticated;
--> statement-breakpoint
DROP POLICY IF EXISTS creative_library_entry_insert_own_venture ON creative_library_entry;
--> statement-breakpoint
DROP POLICY IF EXISTS creative_library_entry_update_own_venture ON creative_library_entry;
