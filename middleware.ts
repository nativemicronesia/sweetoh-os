import { type NextRequest } from "next/server";
import { createClient } from "@/lib/auth/supabase/middleware";

export async function middleware(_request: NextRequest) {
  const { supabase, response } = createClient(_request);
  await supabase.auth.getUser();
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|api/photo|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
