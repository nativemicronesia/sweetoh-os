/**
 * The ONLY file in sweetoh-os allowed to import the Product
 * Intelligence Engine module. Maps PIE's own types to the
 * ProductIntelligencePort contract so the rest of this codebase never
 * depends on PIE's types directly -- if PIE moves to its own repo,
 * only this file's import path needs to change.
 */
import {
  runProductIntake,
  saveTemplate,
  type ProductIntelligenceTemplate as EngineTemplate,
  type ProductIntakeResult as EngineRunResult,
} from "@/modules/intelligence/product-engine";
import type {
  ProductIntelligencePort,
  ProductIntelligenceTemplate,
  ProductIntelligenceRunResult,
  DefineProductIntelligenceTemplateInput,
} from "../ports/product-intelligence-port";

function toPortTemplate(template: EngineTemplate): ProductIntelligenceTemplate {
  return {
    id: template.id,
    productType: template.productType,
    mockupBaseImage: template.mockupBaseImage,
    placementRegions: template.placementRegions,
    safeZones: template.safeZones,
    printableAreas: template.printableAreas,
  };
}

function toPortResult(result: EngineRunResult): ProductIntelligenceRunResult {
  if (result.status === "template_matched") {
    return {
      status: "template_matched",
      productType: result.productType,
      sourceImage: result.sourceImage,
      template: toPortTemplate(result.template),
    };
  }

  return {
    status: "template_needed",
    productType: result.productType,
    sourceImage: result.sourceImage,
  };
}

export const productEngineAdapter: ProductIntelligencePort = {
  async runIntake(input) {
    const result = await runProductIntake(input);
    return toPortResult(result);
  },

  async defineTemplate(input: DefineProductIntelligenceTemplateInput) {
    const template = await saveTemplate(input);
    return toPortTemplate(template);
  },
};
