import { config as loadEnv } from "dotenv";
import { createAdminClient } from "@/lib/auth/supabase/admin";
import { getSeedEnv, getServerEnv } from "@/lib/config/env";
import { getDb } from "@/lib/db/client";
import { appUser, venture } from "@/lib/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { upsertAppUserFromSeed } from "@/lib/domains/identity/service";
import type { AppRole } from "@/lib/domains/identity/types";
import { logger } from "@/lib/shared/logger";

loadEnv({ path: ".env.local" });
loadEnv();

const SWEETOH_SLUG = "sweetoh";
const SWEETOH_NAME = "Sweet'Oh Creations";

async function ensureAuthUser(email: string, password: string): Promise<string> {
  const admin = createAdminClient();
  const normalizedEmail = email.trim().toLowerCase();
  const perPage = 1000;
  let page = 1;
  let existing: { id: string } | undefined;
  while (!existing) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    existing = data.users.find((user) => user.email?.toLowerCase() === normalizedEmail);
    if (data.users.length < perPage) break;
    page += 1;
  }

  if (existing) {
    logger.info("seed_auth_user_exists", { email, authUserId: existing.id });
    return existing.id;
  }

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error) {
    throw error;
  }

  if (!data.user) {
    throw new Error(`Failed to create auth user for ${email}`);
  }

  logger.info("seed_auth_user_created", { email, authUserId: data.user.id });
  return data.user.id;
}

async function assertSeedIdentitySafe(input: {
  ventureId: string;
  authUserId: string;
  email: string;
  role: AppRole;
}) {
  const db = getDb();
  const normalizedEmail = input.email.trim().toLowerCase();
  const [emailMatch] = await db.select({ authUserId: appUser.authUserId })
    .from(appUser)
    .where(sql`lower(${appUser.email}) = ${normalizedEmail}`)
    .limit(1);
  if (emailMatch && emailMatch.authUserId !== input.authUserId) {
    throw new Error("Seed email belongs to a different existing app user; refusing to create a parallel identity.");
  }

  if (input.role === "partner") {
    const partners = await db.select({ authUserId: appUser.authUserId })
      .from(appUser)
      .where(and(eq(appUser.ventureId, input.ventureId), eq(appUser.role, "partner"), eq(appUser.active, true)));
    if (partners.some((partner) => partner.authUserId !== input.authUserId)) {
      throw new Error("A different active partner is already assigned to this venture; refusing to create a second partner identity.");
    }
  }
}

async function findExistingSeedAuthUser(input: {
  ventureId: string;
  email: string;
  role: AppRole;
}): Promise<string | null> {
  const db = getDb();
  const normalizedEmail = input.email.trim().toLowerCase();
  const emailMatches = await db.select({ authUserId: appUser.authUserId })
    .from(appUser)
    .where(sql`lower(${appUser.email}) = ${normalizedEmail}`)
    .limit(2);
  if (emailMatches.length > 1) {
    throw new Error("Seed email maps to multiple app users; refusing to choose or create an identity.");
  }

  const emailMatch = emailMatches[0];
  if (input.role === "partner") {
    const partners = await db.select({ authUserId: appUser.authUserId })
      .from(appUser)
      .where(and(eq(appUser.ventureId, input.ventureId), eq(appUser.role, "partner"), eq(appUser.active, true)));
    if (partners.some((partner) => partner.authUserId !== emailMatch?.authUserId)) {
      throw new Error("A different active partner is already assigned to this venture; refusing to create a second partner identity.");
    }
  }

  if (!emailMatch) return null;
  const { data, error } = await createAdminClient().auth.admin.getUserById(emailMatch.authUserId);
  if (error || data.user?.email?.toLowerCase() !== normalizedEmail) {
    throw new Error("Seed email has an existing app-user mapping that does not match Supabase Auth; refusing to create a parallel identity.");
  }
  return emailMatch.authUserId;
}

async function seedAppUser(input: {
  ventureId: string;
  email: string;
  password: string;
  role: AppRole;
}) {
  const authUserId = await findExistingSeedAuthUser(input)
    ?? await ensureAuthUser(input.email, input.password);
  await assertSeedIdentitySafe({
    ventureId: input.ventureId,
    authUserId,
    email: input.email,
    role: input.role,
  });
  const appUserRow = await upsertAppUserFromSeed({
    ventureId: input.ventureId,
    authUserId,
    email: input.email,
    role: input.role,
  });

  logger.info("seed_app_user_upserted", {
    email: input.email,
    role: input.role,
    appUserId: appUserRow.id,
  });

  return appUserRow;
}

async function main() {
  logger.info("seed_foundation_start");

  getServerEnv();
  const seedEnv = getSeedEnv();
  const db = getDb();

  const [ventureRow] = await db
    .insert(venture)
    .values({
      slug: SWEETOH_SLUG,
      name: SWEETOH_NAME,
    })
    .onConflictDoUpdate({
      target: venture.slug,
      set: {
        name: SWEETOH_NAME,
      },
    })
    .returning();

  if (!ventureRow) {
    throw new Error("Failed to upsert venture row");
  }

  logger.info("seed_venture_upserted", {
    ventureId: ventureRow.id,
    slug: ventureRow.slug,
  });

  const ownerAppUser = await seedAppUser({
    ventureId: ventureRow.id,
    email: seedEnv.ownerEmail,
    password: seedEnv.ownerPassword,
    role: "owner",
  });

  if (seedEnv.partnerEmail && seedEnv.partnerPassword) {
    await seedAppUser({
      ventureId: ventureRow.id,
      email: seedEnv.partnerEmail,
      password: seedEnv.partnerPassword,
      role: "partner",
    });
  }

  if (seedEnv.creatorEmail && seedEnv.creatorPassword) {
    await seedAppUser({
      ventureId: ventureRow.id,
      email: seedEnv.creatorEmail,
      password: seedEnv.creatorPassword,
      role: "creator",
    });
  }

  logger.info("seed_foundation_complete", {
    ventureId: ventureRow.id,
    ownerAppUserId: ownerAppUser.id,
  });
}

main().catch((error) => {
  logger.error("seed_foundation_failed", { error: String(error) });
  process.exit(1);
});
