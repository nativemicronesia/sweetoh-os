/**
 * PIE v2+ processor boundaries — interfaces only in v1 (no implementations).
 * See docs/specs/IMAGE-TO-MOCKUP-VISION.md for the target workflow.
 */

import type { PieOutputV1 } from "./pie-output";

export type PieProcessorContext = {
  ventureId: string;
  ventureSlug: string;
  sessionId: string;
  actorUserId: string;
};

export type PieImageProcessorResult = {
  derivedAssetId: string;
  mimeType: string;
};

/** v2: background removal, cutout, normalization */
export interface PieImageProcessor {
  removeBackground(input: {
    context: PieProcessorContext;
    sourceAssetId: string;
  }): Promise<PieImageProcessorResult>;
}

export type PieMeasurementResult = {
  structuredDimensions: PieOutputV1["detection"]["structuredDimensions"];
  confidence?: number;
};

/** v2: calibrated measurements from photo + optional reference */
export interface PieMeasurementProcessor {
  estimateMeasurements(input: {
    context: PieProcessorContext;
    sourceAssetId: string;
    referenceObject?: string;
  }): Promise<PieMeasurementResult>;
}

export type PieMockupGeneratorResult = {
  assetId: string;
  placeholderId: string;
};

/** v2: composited or generative mockup images */
export interface PieMockupGenerator {
  generateMockup(input: {
    context: PieProcessorContext;
    placeholderId: string;
    template: PieOutputV1["template"];
    sourceAssetId: string;
  }): Promise<PieMockupGeneratorResult>;
}

export type PieSupplierMatch = {
  supplierId?: string;
  supplierSku?: string;
  fulfillmentType?: "dropship" | "sweetoh";
  confidence?: number;
  alternatives?: PieSupplierMatch[];
};

/** v2: catalog / Everful matching */
export interface PieSupplierMatcher {
  matchSupplier(input: {
    context: PieProcessorContext;
    output: PieOutputV1;
  }): Promise<PieSupplierMatch | null>;
}

export type PieBatchIntakeItemStatus =
  | "pending"
  | "processing"
  | "draft_created"
  | "failed";

export type PieBatchIntakeItem = {
  id: string;
  batchId: string;
  status: PieBatchIntakeItemStatus;
  productId?: string;
  error?: string;
};

/** v2: bulk catalog creation */
export interface PieBatchIntakeProcessor {
  createBatch(input: {
    ventureId: string;
    actorUserId: string;
  }): Promise<{ batchId: string }>;

  getBatchStatus(batchId: string): Promise<PieBatchIntakeItem[]>;
}

/** Registry placeholder — implementations registered when v2 ships. */
export type PieProcessorRegistry = {
  image?: PieImageProcessor;
  measurement?: PieMeasurementProcessor;
  mockup?: PieMockupGenerator;
  supplier?: PieSupplierMatcher;
  batch?: PieBatchIntakeProcessor;
};

export const pieProcessors: PieProcessorRegistry = {};
