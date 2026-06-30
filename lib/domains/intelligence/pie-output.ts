/**
 * Dekaz Capability: Product Intelligence Engine v1 — versioned output model.
 * Persisted on ai_creation_session (intake_detection legacy + pie_output when migrated).
 */

import { ValidationError } from "@/lib/shared/errors";

export const PIE_OUTPUT_VERSION = 1 as const;

export type PieOutputVersion = typeof PIE_OUTPUT_VERSION;

export type PieDimensionUnit = "in" | "cm" | "mm";

export type PieDimensionSource = "estimated" | "operator" | "measured";

export type PieDimensionEstimate = {
  length?: number;
  width?: number;
  height?: number;
  unit?: PieDimensionUnit;
  source: PieDimensionSource;
  notes?: string;
};

export type PiePrintableArea = {
  id: string;
  label: string;
  notes?: string;
};

/** Extended detection — superset of legacy IntakeDetection. */
export type PieDetectionV1 = {
  productType?: string;
  shape?: string;
  colors?: string[];
  materials?: string[];
  /** Legacy free-text dimensions from vision models. */
  dimensions?: string;
  structuredDimensions?: PieDimensionEstimate;
  printableAreas?: PiePrintableArea[];
  variants?: string[];
};

export type PieProductSpec = {
  summary?: string;
  materials?: string[];
  sizingNotes?: string;
  personalizationNotes?: string;
  productionNotes?: string;
  fulfillmentHints?: string;
};

export type PieProductTemplate = {
  productType?: string;
  variantSlots?: string[];
  personalizationSupported?: boolean;
  notes?: string;
};

export type PieMockupPlaceholderStatus = "pending" | "linked" | "generated";

export type PieMockupPlaceholder = {
  id: string;
  label: string;
  aspectRatio?: string;
  linkedAssetId?: string | null;
  status: PieMockupPlaceholderStatus;
};

export type PieOutputV1 = {
  version: PieOutputVersion;
  detection: PieDetectionV1;
  spec?: PieProductSpec;
  template?: PieProductTemplate;
  mockupPlaceholders?: PieMockupPlaceholder[];
};

/** @deprecated Use PieDetectionV1 — kept for rows written before PIE output v1. */
export type LegacyIntakeDetection = {
  productType?: string;
  colors?: string[];
  materials?: string[];
  dimensions?: string;
  variants?: string[];
};

export function createEmptyPieOutputV1(
  detection: PieDetectionV1 = {},
): PieOutputV1 {
  return {
    version: PIE_OUTPUT_VERSION,
    detection,
    mockupPlaceholders: [],
  };
}

export function isPieOutputV1(value: unknown): value is PieOutputV1 {
  if (!value || typeof value !== "object") {
    return false;
  }

  const record = value as Record<string, unknown>;
  return record.version === PIE_OUTPUT_VERSION && typeof record.detection === "object";
}

export function detectionFromLegacy(
  legacy: LegacyIntakeDetection | null | undefined,
): PieDetectionV1 {
  if (!legacy) {
    return {};
  }

  return {
    productType: legacy.productType,
    colors: legacy.colors,
    materials: legacy.materials,
    dimensions: legacy.dimensions,
    variants: legacy.variants,
  };
}

/**
 * Normalize session JSON whether stored as legacy intake_detection or PieOutputV1.
 */
export function normalizePieOutput(raw: unknown): PieOutputV1 | null {
  if (raw == null) {
    return null;
  }

  if (isPieOutputV1(raw)) {
    return raw;
  }

  if (typeof raw === "object") {
    const legacy = raw as LegacyIntakeDetection;
    if (
      legacy.productType != null ||
      legacy.colors != null ||
      legacy.materials != null ||
      legacy.dimensions != null ||
      legacy.variants != null
    ) {
      return createEmptyPieOutputV1(detectionFromLegacy(legacy));
    }
  }

  return null;
}

export function pieOutputToLegacyDetection(output: PieOutputV1): LegacyIntakeDetection {
  const { detection } = output;
  return {
    productType: detection.productType,
    colors: detection.colors,
    materials: detection.materials,
    dimensions: detection.dimensions,
    variants: detection.variants,
  };
}

/** Resolve editable PIE output from session columns (pie_output preferred). */
export function getPieOutputForSession(input: {
  pieOutput?: unknown;
  intakeDetection?: unknown;
}): PieOutputV1 | null {
  const fromColumn = normalizePieOutput(input.pieOutput);
  if (fromColumn) {
    return fromColumn;
  }

  return normalizePieOutput(input.intakeDetection);
}

export function pieOutputFromDetection(
  detection: PieDetectionV1 | LegacyIntakeDetection | null | undefined,
): PieOutputV1 {
  if (!detection) {
    return createEmptyPieOutputV1();
  }

  if (isPieOutputV1(detection)) {
    return detection;
  }

  return createEmptyPieOutputV1(detectionFromLegacy(detection as LegacyIntakeDetection));
}

export function parsePieOutputJson(raw: unknown): PieOutputV1 {
  if (!isPieOutputV1(raw)) {
    throw new ValidationError(
      `PIE output must be version ${PIE_OUTPUT_VERSION} with a detection object.`,
    );
  }

  return raw;
}
