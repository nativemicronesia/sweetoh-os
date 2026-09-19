import { z } from "zod";

/**
 * Colors and sizes a product is sold in. Sizes may carry an upcharge on top
 * of the product's base price (e.g. 2XL +$2), the way POD platforms price.
 */
export const variantColorSchema = z.object({
  name: z.string().trim().min(1).max(60),
  hex: z.string().regex(/^#[0-9a-f]{6}$/i),
});
export const variantOptionsSchema = z.object({
  colors: z.array(variantColorSchema).max(80),
  sizes: z.array(z.string().trim().min(1).max(30)).max(40),
  sizeUpchargeCents: z.record(z.string(), z.number().int().min(0).max(100_000)),
});
export type VariantColor = z.infer<typeof variantColorSchema>;
export type VariantOptions = z.infer<typeof variantOptionsSchema>;

export type PrintAreaSpec = { position: string; width: number; height: number };
export type CatalogSource = {
  provider: "printify";
  blueprintId: number;
  brand: string;
  model: string;
  printAreas: PrintAreaSpec[];
  availableColors: VariantColor[];
  availableSizes: string[];
};

const SIZE_ORDER = [
  "NB (0-3M)", "0-3M", "3-6M", "6M", "6-12M", "12M", "18M", "24M",
  "2T", "3T", "4T", "5T", "XS", "S", "M", "L", "XL",
  "2XL", "3XL", "4XL", "5XL", "6XL",
];
export function sortSizes(sizes: string[]): string[] {
  const rank = (s: string) => {
    const i = SIZE_ORDER.indexOf(s);
    return i === -1 ? SIZE_ORDER.length : i;
  };
  return [...new Set(sizes)].sort(
    (a, b) => rank(a) - rank(b) || a.localeCompare(b, undefined, { numeric: true }),
  );
}

/** Common POD pricing: extended sizes cost more to buy. */
export function defaultUpcharges(sizes: string[]): Record<string, number> {
  const table: Record<string, number> = { "2XL": 200, "3XL": 400, "4XL": 600, "5XL": 800, "6XL": 1000 };
  return Object.fromEntries(sizes.filter((s) => table[s]).map((s) => [s, table[s]]));
}

export function hasVariants(options: VariantOptions | null | undefined): options is VariantOptions {
  return Boolean(options && (options.colors.length || options.sizes.length));
}

export function unitPriceCents(
  basePriceCents: number,
  options: VariantOptions | null | undefined,
  size: string | null | undefined,
): number {
  return basePriceCents + (size ? (options?.sizeUpchargeCents[size] ?? 0) : 0);
}

export function variantLabel(color?: string | null, size?: string | null): string {
  return [color, size].filter(Boolean).join(" / ");
}

/** Throws if a cart line names a color or size the product isn't sold in. */
export function assertVariantSelection(
  options: VariantOptions | null | undefined,
  color: string | null | undefined,
  size: string | null | undefined,
): void {
  if (!hasVariants(options)) {
    if (color || size) throw new Error("This product has no color or size options.");
    return;
  }
  if (options.colors.length && !options.colors.some((c) => c.name === color))
    throw new Error("Choose an available color.");
  if (!options.colors.length && color) throw new Error("This product has no color options.");
  if (options.sizes.length && !options.sizes.includes(size ?? ""))
    throw new Error("Choose an available size.");
  if (!options.sizes.length && size) throw new Error("This product has no size options.");
}

/* ---------- Garment color names → swatch color ---------- */

const NAMED: Record<string, string> = {
  white: "#ffffff", black: "#1b1b1b", natural: "#efe6d2", ivory: "#f4efdf", cream: "#f3ead3",
  "soft cream": "#efe3c8", cornsilk: "#f3e7a8", butter: "#f6e7a1", banana: "#f4e39b", "banana cream": "#f3e3a7",
  daisy: "#f7d23e", yellow: "#f5d12f", "yellow haze": "#eed98a", "maize yellow": "#f6c945", gold: "#f2a900",
  "old gold": "#c69214", mustard: "#d6a02a", citrus: "#f2e14c", sunset: "#f28b52", melon: "#f59f7c",
  orange: "#f26722", "burnt orange": "#c5591f", "safety orange": "#ff6a13", "texas orange": "#bf5700",
  "tennessee orange": "#ff8200", "bright salmon": "#f47e6e", coral: "#f2735f", "coral silk": "#f27b73",
  yam: "#c8663c", terracotta: "#b5613f", brick: "#9e3d30", chili: "#8e2f25", red: "#c8102e",
  "cherry red": "#b3202c", "cardinal red": "#8a1c2b", cardinal: "#8a1c2b", crimson: "#a3162a",
  "antique cherry red": "#9b1b30", garnet: "#6d1d2a", maroon: "#5e1f28", berry: "#8a2a55",
  crunchberry: "#e0567a", watermelon: "#e2566d", "hot pink": "#e7407c", "neon pink": "#ff4fa0",
  "safety pink": "#f06aa8", fuchsia: "#c2297b", heliconia: "#dc3d8a", "antique heliconia": "#b23a7b",
  azalea: "#f07eb0", "charity pink": "#f5a3c7", pink: "#f4b6c9", "light pink": "#f6c7d6",
  "soft pink": "#f5cdd6", blossom: "#f3bfd0", orchid: "#c89bd0", lilac: "#c7a8d8",
  "lavender dust": "#c3b5d6", violet: "#8f6fbe", purple: "#5b2c83", "team purple": "#4b2a7b",
  grape: "#5a2d6e", iris: "#5c63b4", periwinkle: "#8d9bd6", "lavender blue": "#a3a9d8",
  "flo blue": "#5d8fd7", sky: "#9cc6e8", "baby blue": "#a9cce9", "light blue": "#b3d1ea",
  "ice blue": "#b9d9e8", "carolina blue": "#7ba4db", "columbia blue": "#9bc0e2", "stone blue": "#7f9db4",
  "china blue": "#5c7faa", "blue jean": "#5d7896", denim: "#4f6b8c", "washed denim": "#6c86a5",
  chambray: "#8aa4c0", "mystic blue": "#5b7cb2", "metro blue": "#2f4a8a", "indigo blue": "#3f5987",
  indigo: "#3b4e7a", sapphire: "#0077b6", "antique sapphire": "#1f6f98", "tropical blue": "#0092c7",
  "topaz blue": "#1a8fa6", "lagoon blue": "#6ec6d6", "tahiti blue": "#6fc4d9", "bondi blue": "#1f9bbf",
  aqua: "#00a5b5", turquoise: "#20b2c0", seafoam: "#8fd2c1", "chalky mint": "#9ed9c6", mint: "#a9dfbf",
  "mint green": "#a9dfbf", "island reef": "#8fd8c4", "island green": "#12a38a", "jade dome": "#1f8a78",
  teal: "#008080", "deep teal": "#15525c", "royal caribe": "#1b75bc", royal: "#2a4ea6",
  "true royal": "#244fa3", navy: "#1f2a44", "true navy": "#1f2a44", "midnight navy": "#1b2338",
  midnight: "#23293a", "blue spruce": "#2e4e47", forest: "#244234", "forest green": "#244234",
  "kelly green": "#2f9e44", kelly: "#2f9e44", "irish green": "#1f9a4b", "apple green": "#7cc242",
  apple: "#7cc242", kiwi: "#8bbf3f", lime: "#a4d65e", "safety green": "#c6f048", pistachio: "#bfd89a",
  "light green": "#b5d9a3", sage: "#9caf88", moss: "#7d8b5a", olive: "#6b6b3a", "light olive": "#8f8d5c",
  "military green": "#5b6443", army: "#5c5a3d", khaki: "#b8a47e", sand: "#d8c8a8", hemp: "#b09a74",
  tweed: "#6f6a5f", "brown savana": "#8a6e55", brown: "#5a3e2b", "dark chocolate": "#3d2b24",
  espresso: "#3c2a21", bay: "#b8c2b0", "ice grey": "#d4d7d6", silver: "#c9cbcc", ash: "#d6d6d1",
  "sport grey": "#a8a9a5", "athletic heather": "#b2b2ad", heather: "#a9a9a6", gravel: "#8e8f8b",
  "stone gray": "#8f8b83", "warm gray": "#9a938a", storm: "#6d7179", granite: "#6f7072",
  grey: "#8d8d8d", paragon: "#8f9aa3", pepper: "#5f5f5b", graphite: "#4b4c4e", charcoal: "#474a4e",
  asphalt: "#3f4144", "dark grey": "#4a4c50", "dark heather": "#4d4f53", silk: "#ece5d7",
  peach: "#f6b89a", clay: "#b8836b", mauve: "#b784a7", slate: "#6a7b8c", scarlet: "#c21f32",
  "scarlet red": "#c21f32", "galapagos blue": "#2f7fa0", "cool blue": "#7fa7d8", "heavy metal": "#6c6c6c",
  raspberry: "#b3265b", "radiant orchid": "#b565a7", green: "#3f8f4f", "neon green": "#7ddc4a",
};
const BASES = Object.keys(NAMED).sort((a, b) => b.length - a.length);

function mix(hex: string, target: string, amount: number): string {
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [a, b] = [p(hex), p(target)];
  return (
    "#" +
    a.map((v, i) => Math.round(v + (b[i] - v) * amount).toString(16).padStart(2, "0")).join("")
  );
}

/** Best-effort swatch color for a garment color name; the partner can override it. */
export function colorHex(name: string): string {
  const key = name
    .toLowerCase()
    .replace(/^(cvc|antique|sport|vintage|solid|tri-blend|triblend)\s+/g, "")
    .replace(/\bgray\b/g, "grey")
    .trim();
  if (NAMED[key]) return NAMED[key];
  const heather = /\bheather\b/.test(key);
  const light = /\b(light|pale|pastel|soft)\b/.test(key);
  const dark = /\b(dark|deep)\b/.test(key);
  const stripped = key.replace(/\b(heather|light|pale|pastel|soft|dark|deep)\b/g, " ").replace(/\s+/g, " ").trim();
  const base =
    NAMED[stripped] ??
    NAMED[BASES.find((b) => stripped.includes(b)) ?? ""] ??
    NAMED[BASES.find((b) => key.includes(b)) ?? ""] ??
    "#9aa0a6";
  let hex = base;
  if (heather) hex = mix(hex, "#9a9a9a", 0.3);
  if (light) hex = mix(hex, "#ffffff", 0.45);
  if (dark) hex = mix(hex, "#000000", 0.35);
  return hex;
}

/** Relative luminance 0..1, for picking readable text on a swatch. */
export function isLightColor(hex: string): boolean {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.6;
}

/**
 * A starting print area on a catalog photo: centered on the chest and shaped
 * like the product's real front print area. The partner can adjust it.
 */
export function defaultPrintAreaFor(printAreas: PrintAreaSpec[]) {
  const front = printAreas.find((a) => a.position === "front") ?? printAreas[0];
  const ratio = front ? front.height / front.width : 1;
  let width = 0.34;
  let height = width * ratio;
  if (height > 0.5) {
    height = 0.5;
    width = height / ratio;
  }
  return { x: (1 - width) / 2, y: 0.26, width, height };
}

/** Swatch order like a color card: whites to blacks, then colors by hue. */
export function sortColors<T extends { hex: string }>(colors: T[]): T[] {
  const hsl = (hex: string) => {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
    const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, d = max - min;
    const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
    let h = 0;
    if (d) h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    // Offset so reds that sit just below 360° group with the other reds.
    return { h: (h * 60 + 375) % 360, s, l };
  };
  return [...colors].sort((a, b) => {
    const x = hsl(a.hex), y = hsl(b.hex);
    const xn = x.s < 0.15, yn = y.s < 0.15;
    if (xn !== yn) return xn ? -1 : 1;
    return xn ? y.l - x.l : x.h - y.h || y.l - x.l;
  });
}
