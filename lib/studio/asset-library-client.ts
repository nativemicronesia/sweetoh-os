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

function searchTokenForms(token: string) {
  const word = token.toLocaleLowerCase();
  const forms = new Set([word]);
  if (word.length > 5 && word.endsWith("ing")) {
    const base = word.slice(0, -3);
    forms.add(base);
    forms.add(`${base}e`);
    if (/([b-df-hj-np-tv-z])\1$/.test(base)) forms.add(base.slice(0, -1));
    if (base.endsWith("i")) forms.add(`${base.slice(0, -1)}y`);
  }
  if (word.length > 4 && word.endsWith("ies")) forms.add(`${word.slice(0, -3)}y`);
  if (word.length > 3 && word.endsWith("s")) forms.add(word.slice(0, -1));
  if (word.length > 5 && word.endsWith("es")) forms.add(word.slice(0, -2));
  if (word.length > 5 && word.endsWith("ves")) {
    forms.add(`${word.slice(0, -3)}f`);
    forms.add(`${word.slice(0, -3)}fe`);
  }
  return forms;
}

function tokenMatches(words: readonly string[], term: string) {
  const termForms = searchTokenForms(term);
  return words.some((word) => [...searchTokenForms(word)].some((form) => termForms.has(form)));
}

export function matchesStudioAssetQuery(asset: StudioAssetSearchFields, query: string) {
  const tags = typeof asset.tags === "string" ? asset.tags : asset.tags.join(" ");
  const words = `${asset.name} ${asset.category} ${tags}`.toLocaleLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
  const terms = searchTerms(query);
  return terms.length === 0 || terms.some((term) => tokenMatches(words, term));
}

export function studioAssetQueryScore(asset: StudioAssetSearchFields, query: string) {
  const name = asset.name.toLocaleLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
  const category = asset.category.toLocaleLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
  const tags = (typeof asset.tags === "string" ? asset.tags : asset.tags.join(" ")).toLocaleLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
  return searchTerms(query).reduce((score, term) => score + (tokenMatches(name, term) ? 4 : 0) + (tokenMatches(tags, term) ? 2 : 0) + (tokenMatches(category, term) ? 1 : 0), 0);
}

export function saveStudioLibraryIds(storage: Pick<Storage, "setItem">, key: string, ids: readonly string[]) {
  try {
    storage.setItem(key, JSON.stringify(ids));
    return true;
  } catch {
    return false;
  }
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
