import { z } from "zod";
import type { AssetStatus, AssetType } from "@/lib/domains/assets/types";

export const LIBRARY_KINDS = ["element", "vector", "sticker", "pattern", "texture", "background", "font", "illustration", "shape_frame", "design_template", "production_asset"] as const;
export const LIBRARY_SOURCE_KINDS = ["sweetoh_original", "partner_upload", "licensed_external", "approved_internal", "legacy_unknown"] as const;
export const PRODUCTION_METHODS = ["sublimation", "engraving", "dtf", "dtg", "screen_printing", "embroidery", "htv_vinyl", "other"] as const;

export const creativeLibraryMetadataSchema = z.object({
  kind: z.enum(LIBRARY_KINDS), category: z.string().trim().min(1).max(80),
  tags: z.array(z.string().trim().min(1).max(40)).max(64).default([]),
  productionMethods: z.array(z.enum(PRODUCTION_METHODS)).max(8).default([]),
  sourceKind: z.enum(LIBRARY_SOURCE_KINDS), sourceName: z.string().trim().max(200).nullable().default(null),
  sourceUrl: z.string().url().nullable().default(null), evidenceUrl: z.string().url().nullable().default(null),
  licenseId: z.string().trim().max(120).nullable().default(null), licenseUrl: z.string().url().nullable().default(null),
  commercialUse: z.boolean().default(false), modificationAllowed: z.boolean().default(false), redistributionAllowed: z.boolean().default(false),
  attributionRequired: z.boolean().default(false), attributionText: z.string().trim().max(500).nullable().default(null),
  rightsVerifiedAt: z.string().datetime().nullable().default(null), rightsVerifiedById: z.string().uuid().nullable().default(null),
}).strict().superRefine((metadata, ctx) => {
  if (metadata.sourceKind === "licensed_external" && (!metadata.sourceUrl || !metadata.licenseId || !metadata.evidenceUrl)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["evidenceUrl"], message: "External resources need their source, license, and rights evidence recorded." });
  }
  if (metadata.rightsVerifiedAt && !metadata.rightsVerifiedById) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["rightsVerifiedById"], message: "Rights verification must identify the reviewer." });
  }
  if (metadata.attributionRequired && !metadata.attributionText) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["attributionText"], message: "Required attribution text must be recorded." });
  }
});
export type CreativeLibraryMetadata = z.infer<typeof creativeLibraryMetadataSchema>;
export type LibraryUse = "studio_edit" | "commercial_product" | "redistribute_source";
export const STUDIO_IMAGE_LIBRARY_KINDS = ["element", "vector", "sticker", "pattern", "texture", "background", "illustration", "shape_frame", "design_template"] as const;

export type CreativeLibraryAsset = {
  assetId: string; ventureId: string; ownerId: string | null; assetType: AssetType; status: AssetStatus;
  mimeType?: string | null;
  authorityLevel: "canonical" | "derived" | "licensed"; name: string; notes: string | null;
  metadata: CreativeLibraryMetadata | null;
  metadataInvalid?: boolean;
};

export function libraryKindForAssetType(type: AssetType): CreativeLibraryMetadata["kind"] {
  if (type === "product_asset") return "production_asset";
  if (type === "illustration" || type === "character") return "illustration";
  if (type === "sweetoh_design" || type === "creator") return "design_template";
  return "element";
}

/** Legacy assets remain usable in their own venture's established workflow. Unknown external rights never do. */
export function canUseCreativeLibraryAsset(asset: CreativeLibraryAsset, input: { ventureId: string; use: LibraryUse }): boolean {
  if (asset.ventureId !== input.ventureId || asset.status === "archived" || asset.metadataInvalid) return false;
  const m = asset.metadata;
  if (!m) {
    if (asset.authorityLevel === "licensed" && asset.status !== "approved") return false;
    if (input.use === "studio_edit") return asset.status === "draft" || asset.status === "approved" || asset.status === "licensed";
    if (input.use === "commercial_product") return asset.assetType === "sweetoh_design" && asset.status === "approved";
    return false;
  }
  if (m.sourceKind === "licensed_external" && (!m.rightsVerifiedAt || !m.rightsVerifiedById)) return false;
  if (input.use === "studio_edit") {
    if (m.sourceKind === "sweetoh_original") return Boolean(m.sourceName && m.licenseId && m.commercialUse && m.modificationAllowed);
    if (m.sourceKind === "partner_upload" || m.sourceKind === "approved_internal" || m.sourceKind === "legacy_unknown") return true;
    return Boolean(m.rightsVerifiedAt && m.rightsVerifiedById && m.commercialUse && m.modificationAllowed);
  }
  if (input.use === "commercial_product") {
    if (m.sourceKind === "sweetoh_original") return Boolean(m.sourceName && m.licenseId && m.commercialUse && m.modificationAllowed);
    if (m.sourceKind === "partner_upload" || m.sourceKind === "approved_internal" || m.sourceKind === "legacy_unknown") return asset.assetType === "sweetoh_design" && asset.status === "approved";
    return Boolean(asset.status === "approved" && m.rightsVerifiedAt && m.rightsVerifiedById && m.commercialUse && m.modificationAllowed && (!m.attributionRequired || m.attributionText));
  }
  return Boolean(m.rightsVerifiedAt && m.rightsVerifiedById && m.redistributionAllowed && (!m.attributionRequired || m.attributionText));
}

/** Image-backed creative files supported by the existing canvas image layer. */
export function canInsertCreativeLibraryAsset(asset: CreativeLibraryAsset, ventureId: string): boolean {
  return canUseCreativeLibraryAsset(asset, { ventureId, use: "studio_edit" }) &&
    asset.assetType !== "product_asset" && Boolean(asset.mimeType?.startsWith("image/")) &&
    Boolean(asset.metadata && STUDIO_IMAGE_LIBRARY_KINDS.includes(asset.metadata.kind as typeof STUDIO_IMAGE_LIBRARY_KINDS[number]));
}

export function matchesCreativeLibraryQuery(asset: Pick<CreativeLibraryAsset, "name" | "metadata">, query: string): boolean {
  const needle = query.trim().toLocaleLowerCase();
  if (!needle) return true;
  const m = asset.metadata;
  return `${asset.name} ${m?.category ?? ""} ${m?.tags.join(" ") ?? ""} ${m?.sourceName ?? ""}`.toLocaleLowerCase().includes(needle);
}
