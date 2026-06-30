/**
 * Dependency-inversion boundary: venture OS consumers depend only on this
 * interface, never on the Product Intelligence Engine module directly.
 * `adapters/product-engine-adapter.ts` is the only file allowed to import
 * the engine and implement this. Persona adapters (e.g. sweetoh-ai.ts) sit
 * above the port — Sweet'Oh naming stays in venture layer, not here.
 */

export type ProductIntelligenceBoundingBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type ProductIntelligencePlacementRegion = {
  label: string;
  boundingBox: ProductIntelligenceBoundingBox;
};

export type ProductIntelligenceImageRef = {
  bucket: string;
  objectKey: string;
};

export type ProductIntelligenceTemplate = {
  id: string;
  productType: string;
  mockupBaseImage: ProductIntelligenceImageRef;
  placementRegions: ProductIntelligencePlacementRegion[];
  safeZones: ProductIntelligencePlacementRegion[];
  printableAreas: ProductIntelligencePlacementRegion[];
};

export type ProductIntelligenceRunResult =
  | {
      status: "template_matched";
      productType: string;
      sourceImage: ProductIntelligenceImageRef;
      template: ProductIntelligenceTemplate;
    }
  | {
      status: "template_needed";
      productType: string;
      sourceImage: ProductIntelligenceImageRef;
    };

export type DefineProductIntelligenceTemplateInput = {
  productType: string;
  mockupBaseImage: ProductIntelligenceImageRef;
  placementRegions: ProductIntelligencePlacementRegion[];
  safeZones: ProductIntelligencePlacementRegion[];
  printableAreas: ProductIntelligencePlacementRegion[];
};

export interface ProductIntelligencePort {
  runIntake(input: {
    file: Buffer | Uint8Array;
    filename: string;
    mimeType: string;
  }): Promise<ProductIntelligenceRunResult>;

  defineTemplate(
    input: DefineProductIntelligenceTemplateInput,
  ): Promise<ProductIntelligenceTemplate>;
}
