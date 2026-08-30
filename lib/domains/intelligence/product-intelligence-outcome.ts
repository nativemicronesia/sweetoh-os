/**
 * Structured product lifecycle snapshots for audit + future Sweet'Oh intelligence.
 * Phase 2 read-back can query audit_event.metadata.intelligenceOutcome and pil_entries (kind: product).
 */

import { aiOutputFromProduct } from "@/lib/domains/audit/output";
import { aiPromptAuditFields } from "@/lib/domains/audit/prompt";
import { aiTimestampAuditFields } from "@/lib/domains/audit/timestamp";
import type { IntakeDetection } from "@/lib/db/schema/intelligence";
import { getPieOutputForSession, type PieOutputV1 } from "./pie-output";

export type ProductIntelligenceOutcome =
  | "published"
  | "rejected"
  | "reviewed"
  | "approved"
  | "archived"
  | "unpublished"
  | "submitted_for_review";

export type ProductIntelligenceSnapshot = {
  outcome: ProductIntelligenceOutcome;
  productId: string;
  slug: string;
  name: string;
  category: string;
  fulfillmentType: string;
  priceCents: number;
  draftStatus: string;
  active: boolean;
  studioProjectId: string | null;
  sourceAssetId: string | null;
  sessionId: string | null;
  mode: string | null;
  pieOutputVersion: number | null;
};

type ProductRow = {
  id: string;
  slug: string;
  name: string;
  category: string;
  fulfillmentType: string;
  priceCents: number;
  draftStatus: string;
  active: boolean;
  studioProjectId: string | null;
  sourceAssetId: string | null;
  description: string | null;
  shortDescription: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  internalNotes: string | null;
  suggestedTags: string[] | null;
  suggestedCollections: string[] | null;
};

type SessionRow = {
  id: string;
  mode: string;
  prompt: string;
  operatorNotes: string | null;
  confidenceScore: number | null;
  intakeDetection: IntakeDetection | null;
  pieOutput: unknown;
} | null;

export function buildIntelligenceSnapshot(input: {
  outcome: ProductIntelligenceOutcome;
  product: ProductRow;
  session: SessionRow;
}): ProductIntelligenceSnapshot {
  const pieOutput = input.session
    ? getPieOutputForSession({
        pieOutput: input.session.pieOutput,
        intakeDetection: input.session.intakeDetection,
      })
    : null;

  return {
    outcome: input.outcome,
    productId: input.product.id,
    slug: input.product.slug,
    name: input.product.name,
    category: input.product.category,
    fulfillmentType: input.product.fulfillmentType,
    priceCents: input.product.priceCents,
    draftStatus: input.product.draftStatus,
    active: input.product.active,
    studioProjectId: input.product.studioProjectId,
    sourceAssetId: input.product.sourceAssetId,
    sessionId: input.session?.id ?? null,
    mode: input.session?.mode ?? null,
    pieOutputVersion: pieOutput?.version ?? null,
  };
}

export function buildProductIntelligenceOutcomeMetadata(input: {
  outcome: ProductIntelligenceOutcome;
  product: ProductRow;
  session: SessionRow;
  actorFields: Record<string, unknown>;
  reason?: string | null;
  canPublish?: boolean;
  recordedAt?: Date;
}) {
  const intelligenceOutcome = buildIntelligenceSnapshot({
    outcome: input.outcome,
    product: input.product,
    session: input.session,
  });

  const pieOutput: PieOutputV1 | null = input.session
    ? getPieOutputForSession({
        pieOutput: input.session.pieOutput,
        intakeDetection: input.session.intakeDetection,
      })
    : null;

  return {
    intelligenceOutcome,
    productName: input.product.name,
    slug: input.product.slug,
    category: input.product.category,
    fulfillmentType: input.product.fulfillmentType,
    draftStatus: input.product.draftStatus,
    ...(input.reason !== undefined ? { reason: input.reason?.trim() || null } : {}),
    ...(input.canPublish !== undefined ? { canPublish: input.canPublish } : {}),
    sessionId: input.session?.id ?? null,
    mode: input.session?.mode ?? null,
    ...(pieOutput ? { pieOutput } : {}),
    ...(input.session
      ? aiPromptAuditFields({
          prompt: input.session.prompt,
          operatorNotes: input.session.operatorNotes,
          mode: input.session.mode,
        })
      : {}),
    ...aiOutputFromProduct({
      product: input.product,
      confidenceScore: input.session?.confidenceScore ?? null,
      detection: input.session?.intakeDetection ?? null,
    }),
    ...aiTimestampAuditFields(input.recordedAt),
    ...input.actorFields,
  };
}

/** Published Sweet'Oh / PIE-backed products feed the PIL corpus on publish. */
export function shouldCompoundPilOnProductPublish(input: {
  category: string;
  fulfillmentType: string;
  hasAiSession: boolean;
}): boolean {
  return (
    input.hasAiSession ||
    input.fulfillmentType === "sweetoh" ||
    input.category === "custom"
  );
}
