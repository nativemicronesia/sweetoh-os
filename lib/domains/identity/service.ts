import { and, eq } from "drizzle-orm";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/auth/supabase/server";
import { getServerEnv } from "@/lib/config/env";
import { getDb } from "@/lib/db/client";
import { appUser, creatorProfile, venture } from "@/lib/db/schema";
import { ForbiddenError, UnauthorizedError } from "@/lib/shared/errors";
import type { AppRole, SessionUser, SyncAppUserInput } from "./types";

/**
 * Sweet'Oh is an independent venture with its own storefront/checkout, not a
 * sub-brand of Island Sprouts. Which `venture` row this deployment serves is
 * configurable via SWEETOH_VENTURE_SLUG (defaults to "sweetoh") instead of
 * being hardcoded — see lib/config/env.ts.
 */
function currentVentureSlug(): string {
  return getServerEnv().ventureSlug;
}

async function findSessionUser(authUserId: string): Promise<SessionUser | null> {
  const db = getDb();
  const [row] = await db
    .select({
      appUser: appUser,
      ventureSlug: venture.slug,
    })
    .from(appUser)
    .innerJoin(venture, eq(appUser.ventureId, venture.id))
    .where(and(eq(appUser.authUserId, authUserId), eq(appUser.active, true)))
    .limit(1);

  if (!row) {
    return null;
  }

  return {
    authUserId,
    appUser: row.appUser,
    role: row.appUser.role,
    ventureId: row.appUser.ventureId,
    ventureSlug: row.ventureSlug,
  };
}

export const getDefaultVenture = cache(async () => {
  const slug = currentVentureSlug();
  const db = getDb();
  const [row] = await db
    .select()
    .from(venture)
    .where(eq(venture.slug, slug))
    .limit(1);

  if (!row) {
    throw new Error(`Venture not found: ${slug}`);
  }

  return row;
});

export async function getSessionUser(): Promise<SessionUser | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  return findSessionUser(user.id);
}

export async function requireAuth(): Promise<SessionUser> {
  const session = await getSessionUser();

  if (!session) {
    throw new UnauthorizedError();
  }

  return session;
}

export async function requireRole(role: AppRole): Promise<SessionUser> {
  const session = await requireAuth();

  if (session.role !== role) {
    throw new ForbiddenError();
  }

  return session;
}

/**
 * Partner back office — the Sweet'Oh partner only. The owner works from
 * NMH OS, not this login.
 */
export async function requirePartnerWorkspace(): Promise<SessionUser> {
  const session = await getSessionUser();

  if (!session) {
    redirect("/partner/login");
  }

  if (session.role !== "partner") {
    redirect("/partner/login?error=partner_only");
  }

  return session;
}

/**
 * The design Studio is shared: the partner uses it from her back office and
 * creators use it from Create with Sweet'Oh. Every query below it is scoped to
 * session.ventureId, so a creator only ever touches their own workspace.
 */
export async function requireStudioWorkspace(): Promise<SessionUser> {
  const session = await getSessionUser();
  if (!session) redirect("/studio/login");
  if (session.role !== "partner" && session.role !== "creator") redirect("/studio/login?error=creators_only");
  return session;
}

/** Create with Sweet'Oh — creator accounts only. */
export async function requireCreator(): Promise<SessionUser> {
  const session = await getSessionUser();
  if (!session) redirect("/studio/login");
  if (session.role !== "creator") redirect(session.role === "partner" ? "/partner" : "/studio/login?error=creators_only");
  return session;
}

/** Where the shared Studio lives for this person. */
export function studioBase(session: Pick<SessionUser, "role">) {
  return session.role === "creator"
    ? { canvas: "/studio/design", catalog: "/studio/catalog", library: "/studio/designs", home: "/studio" }
    : { canvas: "/partner/canvas", catalog: "/partner/catalog", library: "/partner/library", home: "/partner" };
}

/**
 * New creator: their own private workspace (a venture row nobody else is a
 * member of) plus a creator app_user. Idempotent per auth user.
 */
export async function createCreatorAccount(input: { authUserId: string; email: string; name: string | null }) {
  const db = getDb();
  const [existing] = await db.select().from(appUser).where(eq(appUser.authUserId, input.authUserId)).limit(1);
  if (existing) return existing;
  return db.transaction(async (tx) => {
    const slug = `creator-${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
    const [workspace] = await tx
      .insert(venture)
      .values({ slug, name: input.name ? `${input.name}'s studio` : "Creator studio" })
      .returning();
    const [user] = await tx
      .insert(appUser)
      .values({ ventureId: workspace.id, authUserId: input.authUserId, email: input.email, name: input.name, role: "creator", active: true })
      .returning();
    await tx.insert(creatorProfile).values({ userId: user.id, ventureId: workspace.id });
    return user;
  });
}

export async function syncAppUser(supabaseUser: SyncAppUserInput) {
  const db = getDb();
  const slug = currentVentureSlug();

  const [ventureRow] = await db
    .select()
    .from(venture)
    .where(eq(venture.slug, slug))
    .limit(1);

  if (!ventureRow) {
    throw new Error(`Venture not found: ${slug}`);
  }

  const email = supabaseUser.email ?? "";
  const name =
    supabaseUser.user_metadata?.full_name ??
    supabaseUser.user_metadata?.name ??
    null;

  const [existing] = await db
    .select()
    .from(appUser)
    .where(eq(appUser.authUserId, supabaseUser.id))
    .limit(1);

  if (existing) {
    const [updated] = await db
      .update(appUser)
      .set({
        email,
        name,
        updatedAt: new Date(),
      })
      .where(eq(appUser.id, existing.id))
      .returning();

    return updated;
  }

  throw new Error(
    "Cannot create app_user via syncAppUser without an existing role assignment",
  );
}

export async function upsertAppUserFromSeed(input: {
  ventureId: string;
  authUserId: string;
  email: string;
  name?: string | null;
  role: AppRole;
}) {
  const db = getDb();

  const [row] = await db
    .insert(appUser)
    .values({
      ventureId: input.ventureId,
      authUserId: input.authUserId,
      email: input.email,
      name: input.name ?? null,
      role: input.role,
      active: true,
    })
    .onConflictDoUpdate({
      target: appUser.authUserId,
      set: {
        email: input.email,
      },
    })
    .returning();

  return row;
}
