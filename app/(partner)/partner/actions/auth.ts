"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/auth/supabase/server";
import { getSessionUser } from "@/lib/domains/identity/service";

function redirectLoginError(message: string): never {
  redirect(`/partner/login?error=${encodeURIComponent(message)}`);
}

export async function signInAction(formData: FormData): Promise<void> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    redirectLoginError("Email and password are required.");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirectLoginError(error.message);
  }

  // Only the Sweet'Oh partner may use this login; don't leave anyone else signed in.
  const session = await getSessionUser().catch(() => null);
  if (session?.role !== "partner") {
    await supabase.auth.signOut();
    redirect("/partner/login?error=partner_only");
  }

  redirect("/partner");
}

export async function signOutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/partner/login");
}
