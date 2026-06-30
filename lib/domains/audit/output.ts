import type { IntakeDetection } from "@/lib/db/schema/intelligence";
import type { VisualIntakeOutput } from "@/lib/integrations/ai/intake-types";
import type { ProductDraftOutput } from "@/lib/integrations/ai/types";

export type StoredAiOutput = {
  title: string;
  description: string | null;
  shortDescription: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  category: string;
  suggestedTags: string[] | null;
  suggestedCollections: string[] | null;
  suggestedPriceCents?: number | null;
  internalNotes: string | null;
  confidenceScore?: number | null;
  detection?: IntakeDetection | null;
};

export function aiOutputAuditFields(input: {
  output: ProductDraftOutput | VisualIntakeOutput;
}) {
  const output = input.output;

  return {
    aiOutput: {
      title: output.title,
      description: output.description,
      shortDescription: output.shortDescription,
      seoTitle: output.seoTitle,
      seoDescription: output.seoDescription,
      category: output.category,
      suggestedTags: output.suggestedTags,
      suggestedCollections: output.suggestedCollections,
      suggestedPriceCents: output.suggestedPriceCents,
      internalNotes: output.internalNotes,
      ...("confidenceScore" in output
        ? {
            confidenceScore: output.confidenceScore,
            detection: output.detection ?? null,
          }
        : {}),
    } satisfies StoredAiOutput,
  };
}

export function aiOutputFromProduct(input: {
  product: {
    name: string;
    description: string | null;
    shortDescription: string | null;
    seoTitle: string | null;
    seoDescription: string | null;
    category: string;
    priceCents: number;
    suggestedTags: string[] | null;
    suggestedCollections: string[] | null;
    internalNotes: string | null;
  };
  confidenceScore?: number | null;
  detection?: IntakeDetection | null;
}) {
  return {
    aiOutput: {
      title: input.product.name,
      description: input.product.description,
      shortDescription: input.product.shortDescription,
      seoTitle: input.product.seoTitle,
      seoDescription: input.product.seoDescription,
      category: input.product.category,
      suggestedTags: input.product.suggestedTags,
      suggestedCollections: input.product.suggestedCollections,
      suggestedPriceCents: input.product.priceCents,
      internalNotes: input.product.internalNotes,
      confidenceScore: input.confidenceScore ?? null,
      detection: input.detection ?? null,
    } satisfies StoredAiOutput,
  };
}

export function getStoredAiOutput(
  metadata: Record<string, unknown> | null,
): StoredAiOutput | null {
  if (!metadata || typeof metadata.aiOutput !== "object" || metadata.aiOutput === null) {
    return null;
  }

  const output = metadata.aiOutput as Record<string, unknown>;

  if (typeof output.title !== "string") {
    return null;
  }

  return {
    title: output.title,
    description: typeof output.description === "string" ? output.description : null,
    shortDescription:
      typeof output.shortDescription === "string" ? output.shortDescription : null,
    seoTitle: typeof output.seoTitle === "string" ? output.seoTitle : null,
    seoDescription:
      typeof output.seoDescription === "string" ? output.seoDescription : null,
    category: typeof output.category === "string" ? output.category : "unknown",
    suggestedTags: Array.isArray(output.suggestedTags)
      ? output.suggestedTags.filter((item): item is string => typeof item === "string")
      : null,
    suggestedCollections: Array.isArray(output.suggestedCollections)
      ? output.suggestedCollections.filter(
          (item): item is string => typeof item === "string",
        )
      : null,
    suggestedPriceCents:
      typeof output.suggestedPriceCents === "number"
        ? output.suggestedPriceCents
        : null,
    internalNotes:
      typeof output.internalNotes === "string" ? output.internalNotes : null,
    confidenceScore:
      typeof output.confidenceScore === "number" ? output.confidenceScore : null,
    detection:
      output.detection && typeof output.detection === "object"
        ? (output.detection as IntakeDetection)
        : null,
  };
}

export function formatStoredOutputPreview(
  metadata: Record<string, unknown> | null,
): string | null {
  const output = getStoredAiOutput(metadata);

  if (!output) {
    return null;
  }

  const parts = [output.title];

  if (output.shortDescription) {
    parts.push(output.shortDescription);
  } else if (output.description) {
    parts.push(
      output.description.length > 80
        ? `${output.description.slice(0, 80)}…`
        : output.description,
    );
  }

  return parts.join(" — ");
}
