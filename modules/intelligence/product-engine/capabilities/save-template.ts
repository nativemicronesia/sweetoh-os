import { db } from "../db/client";
import { productIntelligenceAssets } from "../db/schema";
import type {
  NewProductIntelligenceTemplate,
  ProductIntelligenceTemplate,
} from "../types";

export async function saveTemplate(
  input: NewProductIntelligenceTemplate,
): Promise<ProductIntelligenceTemplate> {
  const [row] = await db
    .insert(productIntelligenceAssets)
    .values({
      productType: input.productType,
      mockupBaseImageBucket: input.mockupBaseImage.bucket,
      mockupBaseImageObjectKey: input.mockupBaseImage.objectKey,
      placementRegions: input.placementRegions,
      safeZones: input.safeZones,
      printableAreas: input.printableAreas,
    })
    .returning();

  if (!row) {
    throw new Error("Failed to save product intelligence template.");
  }

  return {
    id: row.id,
    productType: row.productType,
    mockupBaseImage: {
      bucket: row.mockupBaseImageBucket,
      objectKey: row.mockupBaseImageObjectKey,
    },
    placementRegions: input.placementRegions,
    safeZones: input.safeZones,
    printableAreas: input.printableAreas,
    createdAt: row.createdAt,
  };
}
