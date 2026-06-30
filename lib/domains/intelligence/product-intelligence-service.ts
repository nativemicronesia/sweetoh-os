import { recordAuditEvent } from "@/lib/domains/audit/service";
import { createAssetWithUpload } from "@/lib/domains/assets/service";
import { logger } from "@/lib/shared/logger";
import { productEngineAdapter } from "./adapters/product-engine-adapter";
import type {
  ProductIntelligencePort,
  ProductIntelligenceRunResult,
  DefineProductIntelligenceTemplateInput,
} from "./ports/product-intelligence-port";

const port: ProductIntelligencePort = productEngineAdapter;

/**
 * Event flow: Upload -> PIE run -> (caller continues with its own AI
 * analysis / human review). This is additive -- it never throws into
 * the caller's main flow; a PIE failure is logged and surfaced as a
 * null result so visual intake keeps working even if PIE is down.
 */
export async function runProductIntelligenceIntake(input: {
  ventureId: string;
  ventureSlug: string;
  actorUserId: string;
  file: Buffer | Uint8Array;
  filename: string;
  mimeType: string;
}): Promise<ProductIntelligenceRunResult | null> {
  let result: ProductIntelligenceRunResult;

  try {
    result = await port.runIntake({
      file: input.file,
      filename: input.filename,
      mimeType: input.mimeType,
    });
  } catch (error) {
    logger.warn("product_intelligence_intake_failed", {
      ventureId: input.ventureId,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }

  // Asset library integration: register the source photo in Island
  // Sprouts' own design library too, so it's visible alongside other
  // approved assets and carries the same approval lifecycle.
  const libraryAsset = await createAssetWithUpload({
    ventureId: input.ventureId,
    ventureSlug: input.ventureSlug,
    uploadedById: input.actorUserId,
    name: `PIE intake — ${result.productType}`,
    assetType: "product_asset",
    file: input.file,
    filename: input.filename,
    mimeType: input.mimeType,
    notes: `Product Intelligence Engine run: ${result.status}`,
  });

  // Session + provenance tracking via the existing audit trail: which
  // photo, which actor, which PIE result, which template (if matched).
  await recordAuditEvent({
    ventureId: input.ventureId,
    actorUserId: input.actorUserId,
    action: "product_intelligence.intake_run",
    entityType: "asset",
    entityId: libraryAsset.id,
    metadata: {
      productType: result.productType,
      status: result.status,
      templateId: result.status === "template_matched" ? result.template.id : null,
      sourceImage: result.sourceImage,
    },
  });

  logger.info("product_intelligence_intake_run", {
    ventureId: input.ventureId,
    productType: result.productType,
    status: result.status,
  });

  return result;
}

/**
 * Called once a human has defined placement regions for a product type
 * that had no existing template (the "template_needed" case). Not yet
 * wired to any UI -- callable end-to-end, but the placement-region
 * input must come from a future operator screen.
 */
export async function defineProductIntelligenceTemplate(
  input: DefineProductIntelligenceTemplateInput & {
    ventureId: string;
    actorUserId: string;
  },
) {
  const template = await port.defineTemplate({
    productType: input.productType,
    mockupBaseImage: input.mockupBaseImage,
    placementRegions: input.placementRegions,
    safeZones: input.safeZones,
    printableAreas: input.printableAreas,
  });

  await recordAuditEvent({
    ventureId: input.ventureId,
    actorUserId: input.actorUserId,
    action: "product_intelligence.template_defined",
    entityType: "product_intelligence_template",
    entityId: template.id,
    metadata: { productType: template.productType },
  });

  logger.info("product_intelligence_template_defined", {
    ventureId: input.ventureId,
    productType: template.productType,
    templateId: template.id,
  });

  return template;
}
