import { config as loadEnv } from "dotenv";
import { createAdminClient } from "@/lib/auth/supabase/admin";
import { getSeedEnv, getServerEnv } from "@/lib/config/env";
import { getDb } from "@/lib/db/client";
import { venture } from "@/lib/db/schema";
import { upsertAppUserFromSeed } from "@/lib/domains/identity/service";
import type { AppRole } from "@/lib/domains/identity/types";
import { logger } from "@/lib/shared/logger";

loadEnv({ path: ".env.local" });
loadEnv();

const SWEETOH_SLUG = "sweetoh";
const SWEETOH_NAME = "Sweet'Oh Creations";

async function ensureAuthUser(email: string, password: string): Promise<string> {
  const admin = createAdminClient();
  const { data: listData, error: listError } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  if (listError) {
    throw listError;
  }

  const existing = listData.users.find(
    (user) => user.email?.toLowerCase() === email.toLowerCase(),
  );

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

async function seedAppUser(input: {
  ventureId: string;
  email: string;
  password: string;
  role: AppRole;
}) {
  const authUserId = await ensureAuthUser(input.email, input.password);
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

  logger.info("seed_foundation_complete", {
    ventureId: ventureRow.id,
    ownerAppUserId: ownerAppUser.id,
  });
}

main().catch((error) => {
  logger.error("seed_foundation_failed", { error: String(error) });
  process.exit(1);
});
