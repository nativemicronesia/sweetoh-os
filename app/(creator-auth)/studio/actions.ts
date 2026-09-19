"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/auth/supabase/server";
import { createAdminClient } from "@/lib/auth/supabase/admin";
import { createCreatorAccount, getSessionUser } from "@/lib/domains/identity/service";

export type AuthState = { error?: string; email?: string; name?: string } | undefined;

const joinSchema = z.object({
  name: z.string().trim().min(1, "Tell us your name.").max(80),
  email: z.string().trim().toLowerCase().email("Enter a valid email."),
  password: z.string().min(8, "Use at least 8 characters for your password.").max(128),
});

function safeNext(raw: FormDataEntryValue | null) {
  const next = String(raw ?? "");
  return next.startsWith("/studio") && !next.startsWith("//") ? next : "/studio";
}

/**
 * Create with Sweet'Oh sign-up. Accounts are confirmed immediately so a new
 * creator lands straight in the Studio (email verification can be switched on
 * once transactional email is wired).
 */
export async function joinAction(_prev: AuthState, form: FormData): Promise<AuthState> {
  const parsed = joinSchema.safeParse({ name: form.get("name"), email: form.get("email"), password: form.get("password") });
  const echo = { email: String(form.get("email") ?? ""), name: String(form.get("name") ?? "") };
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check your details.", ...echo };
  const { name, email, password } = parsed.data;

  const admin = createAdminClient();
  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: name, source: "create-with-sweetoh" } });
  if (created.error || !created.data.user) {
    const taken = /already|registered|exists/i.test(created.error?.message ?? "");
    return { error: taken ? "That email already has an account — sign in instead." : "Couldn't create your account. Try again.", ...echo };
  }
  try {
    await createCreatorAccount({ authUserId: created.data.user.id, email, name });
  } catch (error) {
    console.error("creator_account_failed", error instanceof Error ? error.message : error);
    await admin.auth.admin.deleteUser(created.data.user.id).catch(() => undefined);
    return { error: "Couldn't set up your studio. Try again.", ...echo };
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect("/studio/login?joined=1");
  redirect(`${safeNext(form.get("next"))}${safeNext(form.get("next")).includes("?") ? "&" : "?"}welcome=1`);
}

export async function studioSignInAction(_prev: AuthState, form: FormData): Promise<AuthState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  if (!email || !password) return { error: "Enter your email and password.", email };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: "That email and password don't match.", email };
  const session = await getSessionUser().catch(() => null);
  if (session?.role === "partner") redirect("/partner");
  if (session?.role !== "creator") {
    await supabase.auth.signOut();
    return { error: "This account isn't a creator account.", email };
  }
  redirect(safeNext(form.get("next")));
}

export async function studioSignOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/create");
}
