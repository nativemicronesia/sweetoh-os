import { canInsertCreativeLibraryAsset, canUseCreativeLibraryAsset, type CreativeLibraryAsset } from "@/lib/domains/library/model";
import { inferSurfaceImageRole, PRODUCTION_BLANK_ASSET_NOTES, studioLayoutSchema, studioMatchesProductPrintArea, type StudioLayout } from "./studio-layout";

export type StudioProductionAsset = { id: string; assetType: string; status: string; notes: string | null };

/** Return a human-readable reason when a linked Studio design no longer matches current production truth. */
export function studioProductArtworkIssue(input: {
  ventureId: string;
  studio: unknown;
  printArea: { surfaces?: import("./studio-layout").StudioSurface[] } | null;
  design: CreativeLibraryAsset;
  productionAssets: ReadonlyMap<string, StudioProductionAsset>;
  layerAssets: ReadonlyMap<string, CreativeLibraryAsset>;
}): string | null {
  const parsed = studioLayoutSchema.safeParse(input.studio);
  if (!parsed.success) return "The associated Studio design layout is invalid. Reopen it in Studio and save a corrected design.";
  const studio: StudioLayout = parsed.data;
  if (!canUseCreativeLibraryAsset(input.design, { ventureId: input.ventureId, use: "commercial_product" })) {
    return "The associated Studio design is no longer approved for commercial product use.";
  }
  if (!studioMatchesProductPrintArea(studio, input.printArea)) {
    return "The associated Studio design no longer matches this product’s saved print area. Reopen the design from this product and save the corrected placement.";
  }
  for (const surface of studio.surfaces) {
    const asset = surface.assetId ? input.productionAssets.get(surface.assetId) : undefined;
    const role = inferSurfaceImageRole({ ...surface, assetNotes: asset?.notes });
    if (!asset || asset.assetType !== "product_asset" || !["approved", "licensed"].includes(asset.status)
      || asset.notes !== PRODUCTION_BLANK_ASSET_NOTES || role !== "production_blank") {
      return `The ${surface.name} production blank is missing, unapproved, or no longer verified. Replace it with a clean production blank in Studio.`;
    }
  }
  for (const surface of input.printArea?.surfaces ?? []) {
    const asset = surface.assetId ? input.productionAssets.get(surface.assetId) : undefined;
    if (!asset || asset.assetType !== "product_asset" || !["approved", "licensed"].includes(asset.status)
      || asset.notes !== PRODUCTION_BLANK_ASSET_NOTES
      || inferSurfaceImageRole({ ...surface, assetNotes: asset.notes }) !== "production_blank") {
      return `The ${surface.name} saved production surface is not a verified clean blank.`;
    }
  }
  const usedAssets = new Set(studio.surfaces.flatMap((surface) => surface.layers.flatMap((layer) => layer.kind === "image" || layer.kind === "pattern" ? [layer.assetId] : [])));
  for (const assetId of usedAssets) {
    const asset = input.layerAssets.get(assetId);
    if (!asset || !canInsertCreativeLibraryAsset(asset, input.ventureId)
      || !canUseCreativeLibraryAsset(asset, { ventureId: input.ventureId, use: "commercial_product" })) {
      return "Artwork in the Studio design is no longer cleared for commercial product use. Remove or replace the affected library asset, then save again.";
    }
  }
  return null;
}
