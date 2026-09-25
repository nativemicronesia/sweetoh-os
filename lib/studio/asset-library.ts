/**
 * Studio-owned, versioned design resources. IDs are persisted in layouts:
 * never rename an ID or remove its SVG while a saved design may refer to it.
 * The seed artwork below was drawn for SweetOh OS and can be used in print.
 * Future packs must include an explicit license and source before registration.
 */
export type StudioAsset = {
  id: string;
  name: string;
  kind: "element" | "pattern";
  category: string;
  tags: readonly string[];
  license: string;
  source: string;
  svg: string;
};

const outline = 'fill="none" stroke="#173e39" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"';
const fill = 'fill="#173e39"';
const svg = (body: string) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">${body}</svg>`;

export const STUDIO_ASSETS: readonly StudioAsset[] = [
  { id: "so-sunburst-v1", name: "Sunburst", kind: "element", category: "Nature", tags: ["sun", "light", "summer"], license: "SweetOh original — free for SweetOh customer designs", source: "SweetOh OS", svg: svg(`<circle cx="100" cy="100" r="34" ${outline}/><path d="M100 8v35m0 114v35M8 100h35m114 0h35M35 35l25 25m80 80 25 25M165 35l-25 25M60 140l-25 25" ${outline}/>` ) },
  { id: "so-wave-v1", name: "Ocean wave", kind: "element", category: "Nature", tags: ["water", "sea", "island"], license: "SweetOh original — free for SweetOh customer designs", source: "SweetOh OS", svg: svg(`<path d="M8 104c25 0 25-30 50-30s25 30 50 30 25-30 50-30 25 30 34 30M8 145c25 0 25-30 50-30s25 30 50 30 25-30 50-30 25 30 34 30" ${outline}/>` ) },
  { id: "so-leaf-v1", name: "Tropical leaf", kind: "element", category: "Nature", tags: ["leaf", "plant", "botanical"], license: "SweetOh original — free for SweetOh customer designs", source: "SweetOh OS", svg: svg(`<path d="M36 170C45 85 82 36 166 22c12 82-23 134-115 150M61 150c31-39 57-62 95-106M87 118l-22-44m47 16-11-52m38 29 38-15m-65 66 54-8" ${outline}/>` ) },
  { id: "so-flower-v1", name: "Island bloom", kind: "element", category: "Nature", tags: ["flower", "floral", "petal"], license: "SweetOh original — free for SweetOh customer designs", source: "SweetOh OS", svg: svg(`<path d="M100 82C71 34 45 29 40 57c-2 13 8 27 26 38-51-6-68 13-50 34 10 11 27 14 51 7-28 32-19 59 8 55 15-2 25-14 27-39 14 45 43 49 55 26 8-15 1-30-21-45 42 3 60-17 47-39-9-15-25-20-47-14 26-31 18-58-5-60-16-1-27 12-31 62Z" ${outline}/><circle cx="101" cy="107" r="18" ${outline}/>` ) },
  { id: "so-spark-v1", name: "Four point spark", kind: "element", category: "Accents", tags: ["star", "shine", "sparkle"], license: "SweetOh original — free for SweetOh customer designs", source: "SweetOh OS", svg: svg(`<path d="M100 14c12 49 24 63 86 86-62 23-74 37-86 86-12-49-24-63-86-86 62-23 74-37 86-86Z" ${outline}/>` ) },
  { id: "so-ribbon-v1", name: "Ribbon", kind: "element", category: "Accents", tags: ["banner", "label", "badge"], license: "SweetOh original — free for SweetOh customer designs", source: "SweetOh OS", svg: svg(`<path d="M18 56h164v88H18l25-44-25-44Zm24 0v88m116-88v88" ${outline}/>` ) },
  { id: "so-arch-v1", name: "Open arch", kind: "element", category: "Frames", tags: ["arch", "frame", "border"], license: "SweetOh original — free for SweetOh customer designs", source: "SweetOh OS", svg: svg(`<path d="M24 185V100a76 76 0 0 1 152 0v85M53 185v-85a47 47 0 0 1 94 0v85" ${outline}/>` ) },
  { id: "so-dots-v1", name: "Confetti dots", kind: "pattern", category: "Patterns", tags: ["dots", "confetti", "repeat"], license: "SweetOh original — free for SweetOh customer designs", source: "SweetOh OS", svg: svg(`<g ${fill}><circle cx="25" cy="26" r="9"/><circle cx="98" cy="25" r="6"/><circle cx="174" cy="29" r="10"/><circle cx="58" cy="85" r="7"/><circle cx="145" cy="92" r="9"/><circle cx="20" cy="155" r="7"/><circle cx="101" cy="160" r="10"/><circle cx="179" cy="165" r="6"/></g>` ) },
  { id: "so-tides-v1", name: "Tide lines", kind: "pattern", category: "Patterns", tags: ["waves", "water", "repeat"], license: "SweetOh original — free for SweetOh customer designs", source: "SweetOh OS", svg: svg(`<path d="M-25 35q25-25 50 0t50 0 50 0 50 0 50 0M-25 85q25-25 50 0t50 0 50 0 50 0 50 0M-25 135q25-25 50 0t50 0 50 0 50 0 50 0M-25 185q25-25 50 0t50 0 50 0 50 0 50 0" ${outline}/>` ) },
  { id: "so-checks-v1", name: "Playful checks", kind: "pattern", category: "Patterns", tags: ["grid", "checks", "repeat"], license: "SweetOh original — free for SweetOh customer designs", source: "SweetOh OS", svg: svg(`<g ${fill}><path d="M0 0h50v50H0zm100 0h50v50h-50zM50 50h50v50H50zm100 0h50v50h-50zM0 100h50v50H0zm100 0h50v50h-50zM50 150h50v50H50zm100 0h50v50h-50z"/></g>` ) },
] as const;

export const STUDIO_ASSET_IDS = new Set(STUDIO_ASSETS.map((asset) => asset.id));
export function studioAsset(id: string) { return STUDIO_ASSETS.find((asset) => asset.id === id); }
export function studioAssetUrl(asset: StudioAsset): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(asset.svg)}`;
}
