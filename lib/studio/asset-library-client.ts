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

/** Small client-safe index. The large SVG bodies stay in server-only asset packs. */
export const STUDIO_ASSET_IDS = new Set<string>(STUDIO_ASSET_MANIFEST.map((asset) => asset.id));
const STUDIO_ASSETS_BY_ID = new Map(STUDIO_ASSET_MANIFEST.map((asset) => [asset.id, asset]));
export function studioAssetMetadata(id: string) {
  return STUDIO_ASSETS_BY_ID.get(id);
}
export function studioAssetUrl(id: string) {
  return `/api/studio/assets/${encodeURIComponent(id)}`;
}
