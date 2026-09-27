import { matchesStudioAssetQuery } from "./asset-library-client";

export type StudioCreativeAssetOption = {
  id: string;
  name: string;
  previewUrl: string;
  kind: string;
  category: string;
  tags: string[];
  productionMethods: string[];
  sourceName: string | null;
  licenseId: string | null;
};

export type StudioCreativeAssetFilters = {
  query?: string;
  kind?: string;
  category?: string;
  tag?: string;
  productionMethod?: string;
};

export function filterStudioCreativeAssets(assets: StudioCreativeAssetOption[], filters: StudioCreativeAssetFilters) {
  return assets.filter((asset) => {
    if (filters.kind && asset.kind !== filters.kind) return false;
    if (filters.category && asset.category !== filters.category) return false;
    if (filters.tag && !asset.tags.includes(filters.tag)) return false;
    if (filters.productionMethod && !asset.productionMethods.includes(filters.productionMethod)) return false;
    return matchesStudioAssetQuery({ name: asset.name, category: asset.category, tags: [asset.kind, ...asset.tags, ...asset.productionMethods, asset.sourceName ?? ""] }, filters.query ?? "");
  });
}
