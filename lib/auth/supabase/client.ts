import { createBrowserClient } from "@supabase/ssr";
import { getPublicEnv } from "@/lib/config/env";

export function createClient() {
  const { supabaseUrl, supabaseAnonKey } = getPublicEnv();

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
