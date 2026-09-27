import { STUDIO_ASSET_MANIFEST } from "./asset-manifest";

export type StudioAssetMetadata = {
  id: string;
  name: string;
  kind: "element" | "pattern";
  category: string;
  tags: readonly string[];
  license: string;
  source: string;
  sourceUrl?: string;
  evidenceUrl?: string;
  licenseId?: string;
  licenseUrl?: string;
  attributionRequired?: boolean;
  attributionText?: string | null;
  commercialUse?: boolean;
  modificationAllowed?: boolean;
  redistributionAllowed?: boolean;
  studioUseApproved: boolean;
  imageUrl?: string;
  width?: number;
  height?: number;
};

export type StudioAssetSearchFields = { name: string; category: string; tags: string | readonly string[] };

function searchTerms(query: string) {
  return query.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
}

export function matchesStudioAssetQuery(asset: StudioAssetSearchFields, query: string) {
  const tags = typeof asset.tags === "string" ? asset.tags : asset.tags.join(" ");
  const text = `${asset.name} ${asset.category} ${tags}`.toLocaleLowerCase();
  return searchTerms(query).every((term) => text.includes(term));
}

export function studioAssetQueryScore(asset: StudioAssetSearchFields, query: string) {
  const name = asset.name.toLocaleLowerCase();
  const category = asset.category.toLocaleLowerCase();
  const tags = (typeof asset.tags === "string" ? asset.tags : asset.tags.join(" ")).toLocaleLowerCase();
  return searchTerms(query).reduce((score, term) => score + (name.includes(term) ? 4 : 0) + (tags.includes(term) ? 2 : 0) + (category.includes(term) ? 1 : 0), 0);
}

export function studioAssetOriginLabel(asset: Pick<StudioAssetMetadata, "source" | "license" | "licenseId">) {
  if (asset.source === "SweetOh OS") return "SweetOh original";
  const source = asset.source.split(" — ", 1)[0];
  return `${source} · ${asset.licenseId ?? asset.license}`;
}

/** Small client-safe index. The large SVG bodies stay in server-only asset packs. */
export const STUDIO_ASSET_IDS = new Set<string>(STUDIO_ASSET_MANIFEST.map((asset) => asset.id));
const STUDIO_ASSETS_BY_ID = new Map(STUDIO_ASSET_MANIFEST.map((asset) => [asset.id, asset]));
export function studioAssetMetadata(id: string) {
  return STUDIO_ASSETS_BY_ID.get(id);
}
export function studioAssetCategories() {
  return [...new Set([...STUDIO_ASSET_MANIFEST.filter((asset) => asset.studioUseApproved).map((asset) => asset.category), "Fonts"])].sort((a, b) => a.localeCompare(b));
}
export function studioAssetUrl(id: string) {
  return `/api/studio/assets/${encodeURIComponent(id)}`;
}
