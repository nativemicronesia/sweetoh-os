import { eq } from "drizzle-orm";
import { db } from "../db/client";
import { productIntelligenceAssets } from "../db/schema";
import type {
  PlacementRegion,
  ProductIntelligenceTemplate,
} from "../types";

function toTemplate(
  row: typeof productIntelligenceAssets.$inferSelect,
): ProductIntelligenceTemplate {
  return {
    id: row.id,
    productType: row.productType,
    mockupBaseImage: {
      bucket: row.mockupBaseImageBucket,
      objectKey: row.mockupBaseImageObjectKey,
    },
    placementRegions: row.placementRegions as PlacementRegion[],
    safeZones: row.safeZones as PlacementRegion[],
    printableAreas: row.printableAreas as PlacementRegion[],
    createdAt: row.createdAt,
  };
}

export async function findTemplateByProductType(
  productType: string,
): Promise<ProductIntelligenceTemplate | null> {
  const [row] = await db
    .select()
    .from(productIntelligenceAssets)
    .where(eq(productIntelligenceAssets.productType, productType))
    .limit(1);

  return row ? toTemplate(row) : null;
}
