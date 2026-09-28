import { TABLER_STUDIO_ASSETS } from "./tabler-assets";
import { FEATHER_STUDIO_ASSETS } from "./feather-icons-assets";
import { WIKIMEDIA_PACIFIC_CHARTS_STUDIO_ASSETS } from "./wikimedia-commons-pacific-charts-assets";
import { PATTERNFILLS_STUDIO_ASSETS } from "./patternfills-assets";
import { OPEN_CROP_STUDIO_ASSETS } from "./open-crop-assets";
import { OPENCLIPART_STUDIO_ASSETS } from "./openclipart-assets";
import { OPENCLIPART_COMPOSITION_ASSETS } from "./openclipart-composition-assets";
import { OPENCLIPART_SEASONAL_STUDIO_ASSETS } from "./openclipart-seasonal-assets";
import { OPENMOJI_STUDIO_ASSETS } from "./openmoji-assets";
import { HERO_PATTERN_STUDIO_ASSETS } from "./hero-pattern-assets";
import { OPENGAMEART_TEXTURE_STUDIO_ASSETS } from "./opengameart-texture-assets";
import { LIBRECLIPART_STUDIO_ASSETS } from "./libreclipart-assets";
import { LIBRECLIPART_SPORTS_STUDIO_ASSETS } from "./libreclipart-sports-assets";
import { LIBRECLIPART_EVERYDAY_STUDIO_ASSETS } from "./libreclipart-everyday-assets";
import { LIBRECLIPART_WORKLIFE_STUDIO_ASSETS } from "./libreclipart-worklife-assets";
import { LIBRECLIPART_LIFE_EVENTS_STUDIO_ASSETS } from "./libreclipart-life-events-assets";
import { UIGRADIENTS_STUDIO_ASSETS } from "./uigradients-assets";
import { OPEN_DOODLES_STUDIO_ASSETS } from "./open-doodles-assets";
import { KITBITZ_STUDIO_ASSETS } from "./kitbitz-assets";
import { OPEN_PEEPS_STUDIO_ASSETS } from "./open-peeps-assets";
import { PHYLOPIC_STUDIO_ASSETS } from "./phylopic-assets";
import { SMITHSONIAN_STUDIO_ASSETS } from "./smithsonian-assets";
import { MET_STUDIO_ASSETS } from "./met-assets";
import { CLEVELAND_STUDIO_ASSETS } from "./cleveland-assets";
import { WELLCOME_ORNAMENT_STUDIO_ASSETS } from "./wellcome-ornament-assets";
import { SWEETOH_STATIONERY_ASSETS } from "./stationery-assets";
import { SWEETOH_ORIGINAL_ILLUSTRATION_ASSETS } from "./original-illustration-assets";
import { STUDIO_ASSET_IDS, studioAssetUrl } from "./asset-library-client";

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
  sourceUrl?: string;
  evidenceUrl?: string;
  licenseId?: string;
  licenseUrl?: string;
  attributionRequired?: boolean;
  attributionText?: string | null;
  commercialUse?: boolean;
  modificationAllowed?: boolean;
  redistributionAllowed?: boolean;
  svg?: string;
  /** Bundled same-origin bitmap resource for source art that is not vector. */
  imageUrl?: string;
  width?: number;
  height?: number;
};

const outline = 'fill="none" stroke="#173e39" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"';
const fill = 'fill="#173e39"';
const svg = (body: string) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">${body}</svg>`;

const SWEETOH_STUDIO_ASSETS: readonly StudioAsset[] = [
  { id: "so-sunburst-v1", name: "Sunburst", kind: "element", category: "Nature", tags: ["sun", "light", "summer"], license: "SweetOh original — free for SweetOh customer designs", source: "SweetOh OS", svg: svg(`<circle cx="100" cy="100" r="34" ${outline}/><path d="M100 8v35m0 114v35M8 100h35m114 0h35M35 35l25 25m80 80 25 25M165 35l-25 25M60 140l-25 25" ${outline}/>` ) },
  { id: "so-wave-v1", name: "Ocean wave", kind: "element", category: "Nature", tags: ["water", "sea", "island"], license: "SweetOh original — free for SweetOh customer designs", source: "SweetOh OS", svg: svg(`<path d="M8 104c25 0 25-30 50-30s25 30 50 30 25-30 50-30 25 30 34 30M8 145c25 0 25-30 50-30s25 30 50 30 25-30 50-30 25 30 34 30" ${outline}/>` ) },
  { id: "so-leaf-v1", name: "Tropical leaf", kind: "element", category: "Nature", tags: ["leaf", "plant", "botanical"], license: "SweetOh original — free for SweetOh customer designs", source: "SweetOh OS", svg: svg(`<path d="M36 170C45 85 82 36 166 22c12 82-23 134-115 150M61 150c31-39 57-62 95-106M87 118l-22-44m47 16-11-52m38 29 38-15m-65 66 54-8" ${outline}/>` ) },
  { id: "so-flower-v1", name: "Island bloom", kind: "element", category: "Nature", tags: ["flower", "floral", "petal", "spring", "wedding", "anniversary", "mothers day", "garden"], license: "SweetOh original — free for SweetOh customer designs", source: "SweetOh OS", svg: svg(`<path d="M100 82C71 34 45 29 40 57c-2 13 8 27 26 38-51-6-68 13-50 34 10 11 27 14 51 7-28 32-19 59 8 55 15-2 25-14 27-39 14 45 43 49 55 26 8-15 1-30-21-45 42 3 60-17 47-39-9-15-25-20-47-14 26-31 18-58-5-60-16-1-27 12-31 62Z" ${outline}/><circle cx="101" cy="107" r="18" ${outline}/>` ) },
  { id: "so-spark-v1", name: "Four point spark", kind: "element", category: "Accents", tags: ["star", "shine", "sparkle", "celebration", "birthday", "wedding", "christmas", "new year"], license: "SweetOh original — free for SweetOh customer designs", source: "SweetOh OS", svg: svg(`<path d="M100 14c12 49 24 63 86 86-62 23-74 37-86 86-12-49-24-63-86-86 62-23 74-37 86-86Z" ${outline}/>` ) },
  { id: "so-ribbon-v1", name: "Ribbon", kind: "element", category: "Accents", tags: ["banner", "label", "badge", "birthday", "wedding", "graduation", "gift", "party", "award"], license: "SweetOh original — free for SweetOh customer designs", source: "SweetOh OS", svg: svg(`<path d="M18 56h164v88H18l25-44-25-44Zm24 0v88m116-88v88" ${outline}/>` ) },
  { id: "so-arch-v1", name: "Open arch", kind: "element", category: "Frames", tags: ["arch", "frame", "border"], license: "SweetOh original — free for SweetOh customer designs", source: "SweetOh OS", svg: svg(`<path d="M24 185V100a76 76 0 0 1 152 0v85M53 185v-85a47 47 0 0 1 94 0v85" ${outline}/>` ) },
  { id: "so-dots-v1", name: "Confetti dots", kind: "pattern", category: "Patterns", tags: ["dots", "confetti", "repeat", "birthday", "party", "graduation", "wedding", "new year"], license: "SweetOh original — free for SweetOh customer designs", source: "SweetOh OS", svg: svg(`<g ${fill}><circle cx="25" cy="26" r="9"/><circle cx="98" cy="25" r="6"/><circle cx="174" cy="29" r="10"/><circle cx="58" cy="85" r="7"/><circle cx="145" cy="92" r="9"/><circle cx="20" cy="155" r="7"/><circle cx="101" cy="160" r="10"/><circle cx="179" cy="165" r="6"/></g>` ) },
  { id: "so-tides-v1", name: "Tide lines", kind: "pattern", category: "Patterns", tags: ["waves", "water", "repeat", "ocean", "coastal", "summer", "travel", "island"], license: "SweetOh original — free for SweetOh customer designs", source: "SweetOh OS", svg: svg(`<path d="M-25 35q25-25 50 0t50 0 50 0 50 0 50 0M-25 85q25-25 50 0t50 0 50 0 50 0 50 0M-25 135q25-25 50 0t50 0 50 0 50 0 50 0M-25 185q25-25 50 0t50 0 50 0 50 0 50 0" ${outline}/>` ) },
  { id: "so-checks-v1", name: "Playful checks", kind: "pattern", category: "Patterns", tags: ["grid", "checks", "repeat", "kids", "back to school", "sports", "evergreen"], license: "SweetOh original — free for SweetOh customer designs", source: "SweetOh OS", svg: svg(`<g ${fill}><path d="M0 0h50v50H0zm100 0h50v50h-50zM50 50h50v50H50zm100 0h50v50h-50zM0 100h50v50H0zm100 0h50v50h-50zM50 150h50v50H50zm100 0h50v50h-50z"/></g>` ) },
  { id: "so-confetti-v1", name: "Party confetti", kind: "pattern", category: "Textures", tags: ["party", "celebration", "sprinkles", "repeat", "birthday", "graduation", "wedding", "new year", "summer"], license: "SweetOh original — free for SweetOh customer designs", source: "SweetOh OS", svg: svg(`<g ${fill}><path d="m18 28 18-8 5 10-18 8zm72 15 8-21 10 4-8 21zm69-23 20 7-4 11-20-7zM32 92l17 5-4 12-17-5zm57 3 20-7 4 11-20 7zm60-4 7-18 10 4-7 18zM15 151l21-5 3 12-21 5zm72 20 12-17 9 7-12 17zm63-21 22 2-1 12-22-2z"/></g>` ) },
  { id: "so-scallop-v1", name: "Scallop border", kind: "pattern", category: "Backgrounds", tags: ["border", "coastal", "decorative", "repeat", "wedding", "summer", "frame", "ocean"], license: "SweetOh original — free for SweetOh customer designs", source: "SweetOh OS", svg: svg(`<path d="M0 80q25-48 50 0t50 0 50 0 50 0M0 130q25-48 50 0t50 0 50 0 50 0" ${outline}/>` ) },
  { id: "so-rainbow-v1", name: "Rainbow arch", kind: "element", category: "Frames", tags: ["rainbow", "arch", "frame", "joy"], license: "SweetOh original — free for SweetOh customer designs", source: "SweetOh OS", svg: svg(`<path d="M25 175v-66a75 75 0 0 1 150 0v66M48 175v-66a52 52 0 0 1 104 0v66M72 175v-66a28 28 0 0 1 56 0v66" ${outline}/>` ) },
  { id: "so-sunshine-v1", name: "Sunshine face", kind: "element", category: "Nature", tags: ["sun", "face", "summer", "happy"], license: "SweetOh original — free for SweetOh customer designs", source: "SweetOh OS", svg: svg(`<circle cx="100" cy="104" r="47" ${outline}/><path d="M100 9v27m0 136v23M9 104h27m128 0h27M35 39l19 19m92 92 19 19m0-130-19 19M54 150l-19 19" ${outline}/><circle cx="83" cy="96" r="3" ${fill}/><circle cx="117" cy="96" r="3" ${fill}/><path d="M80 119q20 20 40 0" ${outline}/>` ) },
  { id: "so-sea-glass-tile-v1", name: "Sea glass tile", kind: "pattern", category: "Patterns", tags: ["sea glass", "coastal", "pebbles", "ocean", "repeat"], license: "SweetOh original — free for SweetOh customer designs", source: "SweetOh OS", svg: svg(`<g ${outline}><path d="M27 33q8-11 18-2l7 14-12 11-14-6zM103 23q8-9 17 0l4 16-12 9-13-9zM162 45q11-6 18 5l-2 14-15 5-10-11zM65 91q9-9 18 1l3 14-12 10-12-10zM142 105q8-10 18-2l7 13-10 12-15-7zM22 158q10-8 18 1l2 15-13 8-12-10zM94 156q7-9 16-2l7 13-11 11-13-8zM169 157q8-9 15-2l2 14-11 9-11-10z"/></g>` ) },
  { id: "so-botanical-sprigs-v1", name: "Botanical sprigs", kind: "pattern", category: "Patterns", tags: ["botanical", "leaves", "garden", "floral", "repeat"], license: "SweetOh original — free for SweetOh customer designs", source: "SweetOh OS", svg: svg(`<g ${outline}><path d="M44 53q6-25 28-27-1 22-28 27Zm0 0q-24-8-25-29 23 2 25 29Zm0 0v27m90-36q8-25 29-28-3 23-29 28Zm0 0q-24-7-25-28 23 2 25 28Zm0 0v27M45 143q6-25 28-27-1 22-28 27Zm0 0q-24-8-25-29 23 2 25 29Zm0 0v27m89-37q8-25 29-28-3 23-29 28Zm0 0q-24-7-25-28 23 2 25 28Zm0 0v27"/></g>` ) },
  { id: "so-wave-lattice-v1", name: "Wave lattice", kind: "pattern", category: "Patterns", tags: ["wave", "ocean", "geometric", "coastal", "repeat"], license: "SweetOh original — free for SweetOh customer designs", source: "SweetOh OS", svg: svg(`<g ${outline}><path d="M0 0q25 25 0 50t0 50 0 50 0 50M50 0q25 25 0 50t0 50 0 50 0 50M100 0q25 25 0 50t0 50 0 50 0 50M150 0q25 25 0 50t0 50 0 50 0 50M200 0q25 25 0 50t0 50 0 50 0 50M0 0q25-25 50 0t50 0 50 0 50 0M0 50q25-25 50 0t50 0 50 0 50 0M0 100q25-25 50 0t50 0 50 0 50 0M0 150q25-25 50 0t50 0 50 0 50 0M0 200q25-25 50 0t50 0 50 0 50 0"/></g>` ) },
  { id: "so-engraver-hatch-v1", name: "Fine hatch texture", kind: "pattern", category: "Textures", tags: ["engraving", "hatch", "linework", "texture", "background"], license: "SweetOh original — free for SweetOh customer designs", source: "SweetOh OS", svg: svg(`<g ${outline}><path d="M-20 20 20-20M-20 60 60-20M-20 100 100-20M-20 140 140-20M-20 180 180-20M-20 220 220-20M20 220 220 20M60 220 220 60M100 220 220 100M140 220 220 140M180 220 220 180"/></g>` ) },
  { id: "so-scallop-border-v2", name: "Open scallop border", kind: "pattern", category: "Backgrounds", tags: ["border", "scallop", "coastal", "frame", "repeat"], license: "SweetOh original — free for SweetOh customer designs", source: "SweetOh OS", svg: svg(`<g ${outline}><path d="M0 46q25-42 50 0t50 0 50 0 50 0M0 58q25-42 50 0t50 0 50 0 50 0M0 142q25-42 50 0t50 0 50 0 50 0M0 154q25-42 50 0t50 0 50 0 50 0"/></g>` ) },
  { id: "so-double-oval-frame-v1", name: "Double oval frame", kind: "element", category: "Frames", tags: ["oval", "frame", "border", "label", "engraving"], license: "SweetOh original — free for SweetOh customer designs", source: "SweetOh OS", svg: svg(`<g ${outline}><ellipse cx="100" cy="100" rx="87" ry="66"/><ellipse cx="100" cy="100" rx="76" ry="55"/></g>` ) },
  { id: "so-sunray-corner-frame-v1", name: "Sunray corner frame", kind: "element", category: "Frames", tags: ["sunray", "frame", "border", "corner", "engraving"], license: "SweetOh original — free for SweetOh customer designs", source: "SweetOh OS", svg: svg(`<g ${outline}><path d="M24 86V24h62m90 62V24h-62M24 114v62h62m90-62v62h-62M25 50h28m9 0h18m-56 9v18m0 97h28m9 0h18m-55-9v-18m97-97h28m9 0h18m-55 9v18m0 97h28m9 0h18m-55-9v-18"/></g>` ) },
  { id: "so-sale-seal-v1", name: "Rosette sale seal", kind: "element", category: "Accents", tags: ["sale badge", "badge", "seal", "sticker", "discount", "price", "award", "shopping"], license: "SweetOh original — free for SweetOh customer designs", source: "SweetOh OS", svg: svg(`<path d="m100 12 17 15 22-5 10 21 22 6 3 23 20 13-8 22 12 18-16 17 4 23-22 9-7 22-23-1-15 17-19-12-21 9-13-20-23-2-5-23-21-11 6-22-14-18 15-18-5-23 21-10 5-23 23 0 14-18 20 11 21-8Z" ${outline}/><circle cx="100" cy="100" r="54" ${outline}/><path d="m100 63 10 23 25 2-19 16 6 25-22-13-22 13 6-25-19-16 25-2Z" ${outline}/>` ) },
  { id: "so-cute-label-v1", name: "Cute scallop label", kind: "element", category: "Accents", tags: ["cute label", "label", "tag", "sticker", "kids", "baby", "gift", "heart", "sweet"], license: "SweetOh original — free for SweetOh customer designs", source: "SweetOh OS", svg: svg(`<path d="M42 30q8-17 21-6 11-20 25-5 12-18 25-3 16-15 25 4 19-9 25 8 17 0 16 18 18 9 9 24 14 14-2 26 7 18-8 27 0 18-17 19-9 18-28 12-17 13-27-4-16 10-25-6-17 14-27-3-16 10-25-7-20 7-25-11-19 1-18-19-18-8-8-25-15-12 1-25-9-18 7-27 0-18 18-18Z" ${outline}/><path d="M100 143c-20-14-30-24-30-36 0-14 18-19 30-4 12-15 30-10 30 4 0 12-10 22-30 36Z" ${outline}/>` ) },
  { id: "so-organic-blob-v1", name: "Organic blob outline", kind: "element", category: "Accents", tags: ["organic shape", "blob", "abstract", "shape", "botanical", "background", "evergreen"], license: "SweetOh original — free for SweetOh customer designs", source: "SweetOh OS", svg: svg(`<path d="M39 36c18-19 42-8 57-15 24-11 39-7 50 8 12 16 31 13 40 34 9 21-7 34 1 53 9 22-8 43-29 48-17 4-25 20-48 21-22 1-32-13-51-8-22 5-45-5-49-26-3-17-20-28-15-51 4-21 30-27 44-64Z" ${outline}/>` ) },
  { id: "so-tropical-flourish-v1", name: "Tropical leaf flourish", kind: "element", category: "Nature", tags: ["tropical flourish", "flourish", "leaf", "palm", "island", "botanical", "divider", "summer"], license: "SweetOh original — free for SweetOh customer designs", source: "SweetOh OS", svg: svg(`<path d="M24 167c48-18 91-64 132-133M63 133c-21-3-39-15-49-36 24-1 42 10 49 36Zm19-18c-7-22-4-43 10-62 11 22 7 43-10 62Zm18-22c-1-23 7-42 25-57 5 23-4 42-25 57Zm18-23c7-21 22-35 45-42-3 24-18 39-45 42Zm-45 78c-17-14-26-33-26-57 21 12 30 31 26 57Zm-22 14c-22 5-43 0-62-14 20-12 42-7 62 14Zm71-66c20-9 42-9 64 2-19 14-41 14-64-2Z" ${outline}/>` ) },
  { id: "so-retro-burst-v1", name: "Retro radial burst", kind: "element", category: "Accents", tags: ["retro burst", "burst", "starburst", "sunburst", "celebration", "birthday", "sticker", "comic"], license: "SweetOh original — free for SweetOh customer designs", source: "SweetOh OS", svg: svg(`<path d="m100 8 12 59 35-49-13 59 53-30-34 51 62-5-50 37 59 18-61 10 42 46-57-25 22 58-45-42-1 63-24-58-25 58-1-63-45 42 22-58-57 25 42-46-61-10 59-18-50-37 62 5-34-51 53 30-13-59 35 49Z" ${outline}/>` ) },
] as const;

/** SweetOh originals and separately documented, rights-cleared open-license resources. */
export const STUDIO_ASSETS: readonly StudioAsset[] = [
  ...SWEETOH_STUDIO_ASSETS,
  ...SWEETOH_STATIONERY_ASSETS,
  ...SWEETOH_ORIGINAL_ILLUSTRATION_ASSETS,
  ...TABLER_STUDIO_ASSETS,
  ...FEATHER_STUDIO_ASSETS,
  ...WIKIMEDIA_PACIFIC_CHARTS_STUDIO_ASSETS,
  ...PATTERNFILLS_STUDIO_ASSETS,
  ...OPEN_CROP_STUDIO_ASSETS,
  ...OPENCLIPART_STUDIO_ASSETS,
  ...OPENCLIPART_COMPOSITION_ASSETS,
  ...OPENCLIPART_SEASONAL_STUDIO_ASSETS,
  ...OPENMOJI_STUDIO_ASSETS,
  ...HERO_PATTERN_STUDIO_ASSETS,
  ...OPENGAMEART_TEXTURE_STUDIO_ASSETS,
  ...LIBRECLIPART_STUDIO_ASSETS,
  ...LIBRECLIPART_SPORTS_STUDIO_ASSETS,
  ...LIBRECLIPART_EVERYDAY_STUDIO_ASSETS,
  ...LIBRECLIPART_WORKLIFE_STUDIO_ASSETS,
  ...LIBRECLIPART_LIFE_EVENTS_STUDIO_ASSETS,
  ...UIGRADIENTS_STUDIO_ASSETS,
  ...OPEN_DOODLES_STUDIO_ASSETS,
  ...KITBITZ_STUDIO_ASSETS,
  ...OPEN_PEEPS_STUDIO_ASSETS,
  ...PHYLOPIC_STUDIO_ASSETS,
  ...SMITHSONIAN_STUDIO_ASSETS,
  ...MET_STUDIO_ASSETS,
  ...CLEVELAND_STUDIO_ASSETS,
  ...WELLCOME_ORNAMENT_STUDIO_ASSETS,
];

export function studioAsset(id: string) { return STUDIO_ASSETS.find((asset) => asset.id === id); }
export { STUDIO_ASSET_IDS, studioAssetUrl };
