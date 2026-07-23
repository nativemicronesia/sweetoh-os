import { and, eq } from "drizzle-orm";
import { cache } from "react";
import { createClient } from "@/lib/auth/supabase/server";
import { getServerEnv } from "@/lib/config/env";
import { getDb } from "@/lib/db/client";
import { appUser, venture } from "@/lib/db/schema";
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
