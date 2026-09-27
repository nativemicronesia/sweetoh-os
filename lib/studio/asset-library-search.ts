import { z } from "zod";
import { canUseCreativeLibraryAsset, creativeLibraryMetadataSchema } from "@/lib/domains/library/model";
import { STUDIO_ASSETS, type StudioAsset } from "./asset-library";
import { STUDIO_FONT_LABELS, STUDIO_FONT_PROVENANCE } from "./font-provenance";

export const studioAssetSearchSchema = z.object({ query: z.string().trim().max(100).default(""), kind: z.enum(["any", "element", "pattern", "font"]).default("any"), limit: z.number().int().min(1).max(50).default(20) }).strict();

export function canSurfaceStudioAsset(asset: StudioAsset) {
  if (asset.commercialUse === false || asset.modificationAllowed === false) return false;
  const metadata = creativeLibraryMetadataSchema.parse({ kind: asset.kind === "pattern" ? "pattern" : "element", category: asset.category, tags: asset.tags, productionMethods: [], sourceKind: asset.sourceUrl ? "approved_internal" : "sweetoh_original", sourceName: asset.source, licenseId: asset.licenseId ?? asset.license, commercialUse: asset.commercialUse ?? true, modificationAllowed: asset.modificationAllowed ?? true, redistributionAllowed: asset.redistributionAllowed ?? false, attributionRequired: asset.attributionRequired ?? false, attributionText: asset.attributionText ?? null, sourceUrl: asset.sourceUrl ?? null, evidenceUrl: asset.evidenceUrl ?? null, licenseUrl: asset.licenseUrl ?? null, rightsVerifiedAt: null, rightsVerifiedById: null });
  return canUseCreativeLibraryAsset({ assetId: asset.id, ventureId: "sweetoh-builtins", ownerId: null, assetType: "sweetoh_design", status: "approved", authorityLevel: "canonical", name: asset.name, notes: null, metadata }, { ventureId: "sweetoh-builtins", use: "studio_edit" });
}

/** Server-side search keeps artwork vectors out of the Studio client bundle. */
export function findStudioAssets(input: z.input<typeof studioAssetSearchSchema>) {
  const query = studioAssetSearchSchema.parse(input);
  const terms = query.query.toLowerCase().split(/\s+/).filter(Boolean);
  const entries = [
    ...STUDIO_ASSETS.filter(canSurfaceStudioAsset).map((asset) => ({ id: asset.id, kind: asset.kind, name: asset.name, category: asset.category, tags: asset.tags, license: asset.license, source: asset.source, sourceUrl: asset.sourceUrl ?? null, evidenceUrl: asset.evidenceUrl ?? null, licenseId: asset.licenseId ?? asset.license, licenseUrl: asset.licenseUrl ?? null, attributionRequired: asset.attributionRequired ?? false, attributionText: asset.attributionText ?? null, commercialUse: asset.commercialUse ?? true, modificationAllowed: asset.modificationAllowed ?? true, redistributionAllowed: asset.redistributionAllowed ?? false, sourceKind: asset.sourceUrl ? "approved_internal" as const : "sweetoh_original" as const, libraryKind: asset.kind === "pattern" ? "pattern" as const : "element" as const })),
    ...Object.entries(STUDIO_FONT_PROVENANCE).map(([key, provenance]) => ({ id: `font:${key}`, kind: "font" as const, name: STUDIO_FONT_LABELS[key as keyof typeof STUDIO_FONT_LABELS], category: "Fonts", tags: ["type", "lettering", "typography"], license: provenance.license, source: provenance.source, sourceUrl: provenance.source, evidenceUrl: null, licenseId: provenance.license, licenseUrl: provenance.license.startsWith("Apache") ? "https://www.apache.org/licenses/LICENSE-2.0" : "https://openfontlicense.org/open-font-license-official-text/", attributionRequired: false, attributionText: null, commercialUse: true, modificationAllowed: true, redistributionAllowed: true, sourceKind: "approved_internal" as const, libraryKind: "font" as const })),
  ].filter((entry) => {
    const metadata = creativeLibraryMetadataSchema.parse({ kind: entry.libraryKind, category: entry.category, tags: entry.tags, productionMethods: [], sourceKind: entry.sourceKind, sourceName: entry.source, licenseId: entry.licenseId, commercialUse: entry.commercialUse, modificationAllowed: entry.modificationAllowed, redistributionAllowed: entry.redistributionAllowed, attributionRequired: entry.attributionRequired, attributionText: entry.attributionText, sourceUrl: entry.sourceUrl, evidenceUrl: entry.evidenceUrl, licenseUrl: entry.licenseUrl, rightsVerifiedAt: null, rightsVerifiedById: null });
    return canUseCreativeLibraryAsset({ assetId: entry.id, ventureId: "sweetoh-builtins", ownerId: null, assetType: "sweetoh_design", status: "approved", authorityLevel: "canonical", name: entry.name, notes: null, metadata }, { ventureId: "sweetoh-builtins", use: "studio_edit" });
  });
  return entries
    .filter((entry) => {
      if (query.kind !== "any" && entry.kind !== query.kind) return false;
      if (!terms.length) return true;
      const text = `${entry.name} ${entry.category} ${entry.tags.join(" ")}`.toLowerCase();
      return terms.every((term) => text.includes(term));
    })
    .map((entry, index) => {
      const name = entry.name.toLowerCase();
      const category = entry.category.toLowerCase();
      const tags = entry.tags.join(" ").toLowerCase();
      const score = terms.reduce((total, term) => total + (name.includes(term) ? 4 : 0) + (tags.includes(term) ? 2 : 0) + (category.includes(term) ? 1 : 0), 0);
      return { entry, score, index };
    })
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, query.limit)
    .map(({ entry }) => entry);
}
