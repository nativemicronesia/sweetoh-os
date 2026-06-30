import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { product } from "@/lib/db/schema";
import {
  isPieConfigured,
  isMockAiEnabled,
  isOpenAiConfigured,
} from "@/lib/config/env";
import { AI_IMAGE_INTAKE_BUCKETS } from "@/lib/storage/paths";
import { checkStorageBuckets } from "@/lib/storage/client";

export type PieReadinessCheck = {
  label: string;
  passed: boolean;
  hint?: string;
};

export async function isPieImageIntakeReady(): Promise<{
  ready: boolean;
  issues: string[];
}> {
  try {
    const storage = await checkStorageBuckets([...AI_IMAGE_INTAKE_BUCKETS]);
    const issues = storage.missing.length > 0
      ? [`Missing buckets: ${storage.missing.join(", ")}`]
      : storage.ok
        ? []
        : ["Storage check failed"];
    return { ready: storage.ok, issues };
  } catch {
    return {
      ready: false,
      issues: ["Run npm run setup:storage"],
    };
  }
}

export async function assertPieImageIntakeReady(): Promise<void> {
  const { ready, issues } = await isPieImageIntakeReady();

  if (!ready) {
    throw new Error(
      issues.length > 0
        ? `Image intake requires Supabase storage: ${issues.join("; ")}`
        : "Image intake storage check failed.",
    );
  }
}

export async function getPieReadiness(): Promise<{
  ready: boolean;
  checks: PieReadinessCheck[];
  storage: { objectStorage: boolean };
}> {
  const checks: PieReadinessCheck[] = [];

  checks.push({
    label: "OpenAI API key",
    passed: isOpenAiConfigured(),
    hint: isOpenAiConfigured()
      ? "Live AI generation enabled"
      : "Optional — use AI_MOCK_MODE=true for local E2E",
  });

  checks.push({
    label: "Mock AI mode",
    passed: isMockAiEnabled(),
    hint: isMockAiEnabled()
      ? "Deterministic drafts — no API calls"
      : "Set AI_MOCK_MODE=true in .env.local for offline testing",
  });

  checks.push({
    label: "PIE provider ready",
    passed: isPieConfigured(),
    hint: isPieConfigured()
      ? undefined
      : "Add OPENAI_API_KEY or AI_MOCK_MODE=true",
  });

  try {
    const db = getDb();
    await db
      .select({ draftStatus: product.draftStatus })
      .from(product)
      .limit(1);
    checks.push({ label: "Draft status schema", passed: true });
  } catch {
    checks.push({
      label: "Draft status schema",
      passed: false,
      hint: "Run npm run db:migrate (migration 0008)",
    });
  }

  try {
    const db = getDb();
    await db.select({ id: product.id }).from(product).limit(1);
    checks.push({ label: "Database connection", passed: true });
  } catch {
    checks.push({
      label: "Database connection",
      passed: false,
      hint: "Check DATABASE_URL in .env.local",
    });
  }

  const imageIntake = await isPieImageIntakeReady();
  checks.push({
    label: "Supabase storage buckets",
    passed: imageIntake.ready,
    hint: imageIntake.ready
      ? "Image intake ready"
      : imageIntake.issues.join("; "),
  });

  const ready =
    isPieConfigured() &&
    checks.some((c) => c.label === "Draft status schema" && c.passed) &&
    checks.some((c) => c.label === "Database connection" && c.passed);

  return {
    ready,
    checks,
    storage: { objectStorage: imageIntake.ready },
  };
}

export async function assertPieReady(): Promise<void> {
  const { ready, checks } = await getPieReadiness();

  if (!ready) {
    const failed = checks
      .filter((check) => !check.passed)
      .map((check) => `${check.label}${check.hint ? `: ${check.hint}` : ""}`)
      .join("; ");
    throw new Error(`Product Intelligence Engine not ready — ${failed}`);
  }
}

export const PIE_E2E_STEPS = [
  "Owner → Product Intelligence — create draft (text, image, or both)",
  "Confirm redirect to product detail + completeness checklist",
  "Command Center + Products (Drafts) + Review queue show the draft",
  "Edit PIE outputs on product detail if needed",
  "Review queue → Mark reviewed, Approve & publish, or Reject",
  "Mock mode: text drafts get E2E fixtures (SKU + media) for publish testing",
  "Image modes: run npm run setup:storage once if buckets are missing",
  "Partner → text or visual intake → owner Review queue shows partner drafts",
] as const;
