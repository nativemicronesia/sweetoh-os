import type { product } from "@/lib/db/schema";
import type { aiCreationSession } from "@/lib/db/schema/intelligence";

type ProductRow = typeof product.$inferSelect;
type SessionRow = typeof aiCreationSession.$inferSelect;

export type DraftCompletenessCheck = {
  label: string;
  passed: boolean;
  message?: string;
};

export function evaluateAiProductDraftCompleteness(input: {
  product: ProductRow;
  session: SessionRow | null;
  mediaCount: number;
}): {
  complete: boolean;
  checks: DraftCompletenessCheck[];
} {
  const { product: row, session, mediaCount } = input;
  const isVisual = session?.mode === "visual_intake";

  const checks: DraftCompletenessCheck[] = [
    {
      label: "Title",
      passed: row.name.trim().length > 0,
    },
    {
      label: "Description",
      passed: Boolean(row.description?.trim()),
    },
    {
      label: "Short description",
      passed: Boolean(row.shortDescription?.trim()),
    },
    {
      label: "SEO title",
      passed: Boolean(row.seoTitle?.trim()),
    },
    {
      label: "SEO description",
      passed: Boolean(row.seoDescription?.trim()),
    },
    {
      label: "Category",
      passed: Boolean(row.category),
    },
    {
      label: "Suggested tags",
      passed: (row.suggestedTags?.length ?? 0) > 0,
      message: "At least one tag recommended",
    },
    {
      label: "Suggested collections",
      passed: (row.suggestedCollections?.length ?? 0) > 0,
      message: "At least one collection hint recommended",
    },
    {
      label: "Suggested pricing",
      passed: row.priceCents > 0,
      message:
        row.priceCents > 0
          ? `$${(row.priceCents / 100).toFixed(2)}`
          : "Set a suggested price before publishing",
    },
    {
      label: "Draft status",
      passed:
        row.draftStatus === "draft" ||
        row.draftStatus === "pending_review" ||
        row.draftStatus === "needs_work" ||
        row.draftStatus === "approved",
      message:
        row.draftStatus === "draft"
          ? "Saved as draft — submit for review when ready"
          : `Status: ${row.draftStatus}`,
    },
    {
      label: "Saved to database",
      passed: Boolean(session),
      message: session
        ? "Visible in Products, Review queue, and Command Center"
        : "Missing AI session — may not appear in review queue",
    },
    {
      label: "Not published",
      passed: !row.active,
    },
  ];

  if (isVisual) {
    checks.push(
      {
        label: "Source image (asset)",
        passed: Boolean(row.sourceAssetId),
      },
      {
        label: "Product media",
        passed: mediaCount > 0,
        message: "Photo attached to draft listing",
      },
      {
        label: "Confidence score",
        passed: session?.confidenceScore != null,
      },
      {
        label: "AI detection",
        passed: Boolean(session?.intakeDetection),
      },
    );
  }

  return {
    complete: checks.every((check) => check.passed),
    checks,
  };
}
