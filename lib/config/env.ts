import { z } from "zod";

const publicEnvSchema = z.object({
  NEXT_PUBLIC_SITE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
});

const serverEnvSchema = publicEnvSchema.extend({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  DATABASE_URL: z.string().min(1),
  STRIPE_SECRET_KEY: z.string().min(1).optional(),
  STRIPE_WEBHOOK_SECRET: z.string().min(1).optional(),
  RESEND_API_KEY: z.string().min(1).optional(),
  /** Same key under the name it was saved as in Vercel production. */
  SWEETOH_RESEND_API: z.string().min(1).optional(),
  /** Island Sprouts store — order confirmation and general storefront email */
  ISLAND_SPROUTS_FROM_EMAIL: z.string().email().optional(),
  /** Island Sprouts — customer support / reply-to (displayed on Contact, order emails) */
  ISLAND_SPROUTS_SUPPORT_EMAIL: z.string().email().optional(),
  /** @deprecated Legacy single sender — used when venture-specific from addresses are unset */
  RESEND_FROM_EMAIL: z.string().email().optional(),
  /** Sweet'Oh studio — custom request, production, partner workflow, ready-to-order */
  SWEETOH_FROM_EMAIL: z.string().email().optional(),
  /** Sweet'Oh — customer support / reply-to (create flow, Sweet'Oh emails) */
  SWEETOH_SUPPORT_EMAIL: z.string().email().optional(),
  /** The partner's real mailbox (Gmail): shop inbox forwards and new-request alerts go here. */
  SWEETOH_PARTNER_INBOX: z.string().email().optional(),
  /** Signing secret of the Resend webhook that delivers received email (whsec_…). */
  RESEND_WEBHOOK_SECRET: z.string().min(1).optional(),
  /** @deprecated Use SWEETOH_FROM_EMAIL */
  RESEND_SWEETOH_FROM_EMAIL: z.string().email().optional(),
  OPENAI_API_KEY: z.string().min(1).optional(),
  OPENAI_MODEL: z.string().min(1).default("gpt-4o-mini"),
  ALLOW_MANUAL_ORDER_CHECKOUT: z
    .enum(["true", "false"])
    .optional()
    .default("false"),
  /**
   * Slug of the `venture` row this deployment serves. Sweet'Oh is an
   * independent venture/storefront, not a sub-brand of Island Sprouts —
   * this replaces what used to be a hardcoded "island-sprouts" slug.
   * Defaults to "sweetoh"; override per-environment once the real venture
   * row exists (no migration/seed is created by this change).
   */
  SWEETOH_VENTURE_SLUG: z.string().min(1).default("sweetoh"),
});

export type PublicEnv = {
  siteUrl: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
};

export type ServerEnv = PublicEnv & {
  supabaseServiceRoleKey: string;
  databaseUrl: string;
  stripeSecretKey?: string;
  stripeWebhookSecret?: string;
  resendApiKey?: string;
  islandSproutsFromEmail?: string;
  islandSproutsSupportEmail?: string;
  sweetohFromEmail?: string;
  sweetohSupportEmail?: string;
  sweetohPartnerInbox?: string;
  resendWebhookSecret?: string;
  openaiApiKey?: string;
  openaiModel: string;
  ventureSlug: string;
};

let cachedPublic: PublicEnv | null = null;
let cachedServer: ServerEnv | null = null;

function formatZodError(error: z.ZodError): string {
  return error.issues.map((issue) => issue.path.join(".")).join(", ");
}

export function getPublicEnv(): PublicEnv {
  if (cachedPublic) {
    return cachedPublic;
  }

  const parsed = publicEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(
      `Missing or invalid public environment variables: ${formatZodError(parsed.error)}`,
    );
  }

  cachedPublic = {
    siteUrl: parsed.data.NEXT_PUBLIC_SITE_URL,
    supabaseUrl: parsed.data.NEXT_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: parsed.data.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  };

  return cachedPublic;
}

type ParsedServerEnv = z.infer<typeof serverEnvSchema>;

function resolveResendFromAddresses(parsed: ParsedServerEnv) {
  const legacyFrom = parsed.RESEND_FROM_EMAIL;

  return {
    islandSproutsFromEmail: parsed.ISLAND_SPROUTS_FROM_EMAIL ?? legacyFrom,
    sweetohFromEmail:
      parsed.SWEETOH_FROM_EMAIL ??
      parsed.RESEND_SWEETOH_FROM_EMAIL ??
      legacyFrom,
  };
}

export function getServerEnv(): ServerEnv {
  if (cachedServer) {
    return cachedServer;
  }

  const parsed = serverEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(
      `Missing or invalid server environment variables: ${formatZodError(parsed.error)}`,
    );
  }

  const resendFrom = resolveResendFromAddresses(parsed.data);

  cachedServer = {
    ...getPublicEnv(),
    supabaseServiceRoleKey: parsed.data.SUPABASE_SERVICE_ROLE_KEY,
    databaseUrl: parsed.data.DATABASE_URL,
    stripeSecretKey: parsed.data.STRIPE_SECRET_KEY,
    stripeWebhookSecret: parsed.data.STRIPE_WEBHOOK_SECRET,
    resendApiKey: parsed.data.RESEND_API_KEY ?? parsed.data.SWEETOH_RESEND_API,
    islandSproutsFromEmail: resendFrom.islandSproutsFromEmail,
    islandSproutsSupportEmail: parsed.data.ISLAND_SPROUTS_SUPPORT_EMAIL,
    sweetohFromEmail: resendFrom.sweetohFromEmail,
    sweetohSupportEmail: parsed.data.SWEETOH_SUPPORT_EMAIL,
    sweetohPartnerInbox: parsed.data.SWEETOH_PARTNER_INBOX,
    resendWebhookSecret: parsed.data.RESEND_WEBHOOK_SECRET,
    openaiApiKey: parsed.data.OPENAI_API_KEY,
    openaiModel: parsed.data.OPENAI_MODEL,
    ventureSlug: parsed.data.SWEETOH_VENTURE_SLUG,
  };

  return cachedServer;
}

const STRIPE_PLACEHOLDER_PATTERN =
  /your[_-]?key|sk_test_your|whsec_your|changeme|placeholder|xxx/i;

/** True when a Stripe env value is still a template, not a real key. */
export function isStripePlaceholderValue(value: string | undefined): boolean {
  if (!value?.trim()) {
    return true;
  }

  return STRIPE_PLACEHOLDER_PATTERN.test(value.trim());
}

export function isStripeConfigured(): boolean {
  const env = getServerEnv();
  return Boolean(env.stripeSecretKey && env.stripeWebhookSecret);
}

/** Stripe keys present and not placeholder templates — safe to enable cart checkout. */
export function isStripeCheckoutReady(): boolean {
  const env = getServerEnv();
  return Boolean(
    env.stripeSecretKey &&
      env.stripeWebhookSecret &&
      !isStripePlaceholderValue(env.stripeSecretKey) &&
      !isStripePlaceholderValue(env.stripeWebhookSecret),
  );
}

export function isResendApiConfigured(): boolean {
  return Boolean(getServerEnv().resendApiKey);
}

export function isIslandSproutsEmailConfigured(): boolean {
  const env = getServerEnv();
  return Boolean(env.resendApiKey && env.islandSproutsFromEmail);
}

export function isSweetohEmailConfigured(): boolean {
  const env = getServerEnv();
  return Boolean(env.resendApiKey && env.sweetohFromEmail);
}

/** Sweet'Oh-only deploy: API key + Sweet'Oh from-address. Island Sprouts from not required. */
export function isResendConfigured(): boolean {
  return isSweetohEmailConfigured();
}

/** Customer-facing support address; falls back to the Island Sprouts sender. */
export function getIslandSproutsSupportEmail(): string | undefined {
  const env = getServerEnv();
  return env.islandSproutsSupportEmail ?? env.islandSproutsFromEmail;
}

/** Customer-facing Sweet'Oh support address; falls back to the Sweet'Oh sender. */
export function getSweetohSupportEmail(): string | undefined {
  const env = getServerEnv();
  return env.sweetohSupportEmail ?? env.sweetohFromEmail;
}

export function isOpenAiConfigured(): boolean {
  return Boolean(getServerEnv().openaiApiKey);
}

/** Local E2E testing without OpenAI — set AI_MOCK_MODE=true in .env.local */
export function isMockAiEnabled(): boolean {
  return process.env.AI_MOCK_MODE === "true";
}

/** PIE intake configured (OpenAI or mock). Prefer this name per ADR-015. */
export function isPieConfigured(): boolean {
  return isOpenAiConfigured() || isMockAiEnabled();
}

/** @deprecated Use isPieConfigured — legacy AI Product Builder label. */
export function isAiProductBuilderConfigured(): boolean {
  return isPieConfigured();
}

export function isManualOrderCheckoutEnabled(): boolean {
  if (process.env.NODE_ENV === "production") {
    return false;
  }

  return process.env.ALLOW_MANUAL_ORDER_CHECKOUT === "true";
}

/** Production deploy — manual checkout and localhost site URL are not launch-ready. */
export function isProductionDeploy(): boolean {
  return (
    process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production"
  );
}

export function isSiteUrlLaunchReady(): boolean {
  try {
    const { siteUrl } = getPublicEnv();
    const host = new URL(siteUrl).hostname;
    return host !== "localhost" && host !== "127.0.0.1";
  } catch {
    return false;
  }
}

const seedEnvSchema = z.object({
  FOUNDATION_OWNER_EMAIL: z.string().email(),
  FOUNDATION_OWNER_PASSWORD: z.string().min(8),
  FOUNDATION_PARTNER_EMAIL: z.string().email().optional(),
  FOUNDATION_PARTNER_PASSWORD: z.string().min(8).optional(),
  FOUNDATION_CREATOR_EMAIL: z.string().email().optional(),
  FOUNDATION_CREATOR_PASSWORD: z.string().min(8).optional(),
});

export type SeedEnv = {
  ownerEmail: string;
  ownerPassword: string;
  partnerEmail?: string;
  partnerPassword?: string;
  creatorEmail?: string;
  creatorPassword?: string;
};

export function getSeedEnv(): SeedEnv {
  const parsed = seedEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(
      `Missing or invalid seed environment variables: ${formatZodError(parsed.error)}`,
    );
  }

  const partnerEmail = parsed.data.FOUNDATION_PARTNER_EMAIL?.trim();
  const partnerPassword = parsed.data.FOUNDATION_PARTNER_PASSWORD?.trim();
  const creatorEmail = parsed.data.FOUNDATION_CREATOR_EMAIL?.trim();
  const creatorPassword = parsed.data.FOUNDATION_CREATOR_PASSWORD?.trim();

  if (partnerEmail && !partnerPassword) {
    throw new Error(
      "FOUNDATION_PARTNER_PASSWORD is required when FOUNDATION_PARTNER_EMAIL is set",
    );
  }

  if (partnerPassword && !partnerEmail) {
    throw new Error(
      "FOUNDATION_PARTNER_EMAIL is required when FOUNDATION_PARTNER_PASSWORD is set",
    );
  }

  if (creatorEmail && !creatorPassword) {
    throw new Error(
      "FOUNDATION_CREATOR_PASSWORD is required when FOUNDATION_CREATOR_EMAIL is set",
    );
  }

  if (creatorPassword && !creatorEmail) {
    throw new Error(
      "FOUNDATION_CREATOR_EMAIL is required when FOUNDATION_CREATOR_PASSWORD is set",
    );
  }

  return {
    ownerEmail: parsed.data.FOUNDATION_OWNER_EMAIL,
    ownerPassword: parsed.data.FOUNDATION_OWNER_PASSWORD,
    partnerEmail: partnerEmail || undefined,
    partnerPassword: partnerPassword || undefined,
    creatorEmail: creatorEmail || undefined,
    creatorPassword: creatorPassword || undefined,
  };
}

/** @deprecated Use getPublicEnv() */
export const env = {
  get siteUrl() {
    return getPublicEnv().siteUrl;
  },
  get supabaseUrl() {
    return getPublicEnv().supabaseUrl;
  },
  get supabaseAnonKey() {
    return getPublicEnv().supabaseAnonKey;
  },
};

/** @deprecated Use getServerEnv() */
export const serverEnv = {
  get supabaseServiceRoleKey() {
    return getServerEnv().supabaseServiceRoleKey;
  },
  get databaseUrl() {
    return getServerEnv().databaseUrl;
  },
};
