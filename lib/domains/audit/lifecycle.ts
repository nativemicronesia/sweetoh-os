import { and, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { appUser, auditEvent } from "@/lib/db/schema";
import type { ProductIntelligenceOutcome } from "@/lib/domains/intelligence/product-intelligence-outcome";

export const PRODUCT_LIFECYCLE_AUDIT_ACTIONS = [
  "product.published",
  "product.ai_draft_published",
  "product.unpublished",
  "product.draft_rejected",
  "product.draft_reviewed",
  "product.draft_submitted_for_review",
  "product.archived",
] as const;

export type ProductLifecycleOutcome = ProductIntelligenceOutcome;

export const PRODUCT_LIFECYCLE_OUTCOME_LABELS: Record<
  ProductLifecycleOutcome,
  string
> = {
  published: "Published",
  rejected: "Rejected",
  reviewed: "Reviewed",
  approved: "Approved",
  archived: "Archived",
  unpublished: "Unpublished",
  submitted_for_review: "Submitted for review",
};

function readLifecycleOutcome(
  metadata: Record<string, unknown> | null,
): ProductLifecycleOutcome | null {
  if (!metadata) {
    return null;
  }

  const intelligenceOutcome = metadata.intelligenceOutcome;
  if (
    !intelligenceOutcome ||
    typeof intelligenceOutcome !== "object" ||
    intelligenceOutcome === null
  ) {
    return null;
  }

  const outcome = (intelligenceOutcome as Record<string, unknown>).outcome;
  if (typeof outcome !== "string") {
    return null;
  }

  if (outcome in PRODUCT_LIFECYCLE_OUTCOME_LABELS) {
    return outcome as ProductLifecycleOutcome;
  }

  return null;
}

export async function listProductLifecycleAuditEvents(input: {
  ventureId: string;
  outcome?: ProductLifecycleOutcome;
  limit?: number;
}) {
  const db = getDb();
  const limit = input.limit ?? 150;

  const rows = await db
    .select({
      event: auditEvent,
      actorEmail: appUser.email,
      actorRole: appUser.role,
    })
    .from(auditEvent)
    .leftJoin(appUser, eq(auditEvent.actorUserId, appUser.id))
    .where(
      and(
        eq(auditEvent.ventureId, input.ventureId),
        inArray(auditEvent.action, [...PRODUCT_LIFECYCLE_AUDIT_ACTIONS]),
      ),
    )
    .orderBy(desc(auditEvent.createdAt))
    .limit(limit);

  if (!input.outcome) {
    return rows;
  }

  return rows.filter((row) => {
    const metadata =
      (row.event.metadata as Record<string, unknown> | null) ?? null;
    return readLifecycleOutcome(metadata) === input.outcome;
  });
}

export function getLifecycleOutcomeFromMetadata(
  metadata: Record<string, unknown> | null,
): ProductLifecycleOutcome | null {
  return readLifecycleOutcome(metadata);
}
