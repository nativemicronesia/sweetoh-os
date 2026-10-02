import { type NextRequest } from "next/server";
import { createClient } from "@/lib/auth/supabase/middleware";

export async function middleware(_request: NextRequest) {
  const { supabase, response } = createClient(_request);
  await supabase.auth.getUser();
  return response;
}

export const config = {
  matcher: [
    // Public, session-free routes skip the auth refresh: a search page fetches dozens of icon files, each of which would otherwise cost an auth round trip.
    "/((?!_next/static|_next/image|api/photo|api/studio/icons|api/studio/assets|api/health|api/client-errors|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
