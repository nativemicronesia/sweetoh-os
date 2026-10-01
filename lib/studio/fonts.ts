import {
  Anton,
  Bebas_Neue,
  Caveat,
  Inter,
  Kalam,
  Lobster,
  Montserrat,
  Oswald,
  Pacifico,
  Permanent_Marker,
  Playfair_Display,
  Barlow_Condensed,
  Space_Grotesk,
  Fraunces,
  Tilt_Warp,
  Poppins,
  Raleway,
  Lato,
  Open_Sans,
  Nunito,
  Rubik,
  Work_Sans,
  DM_Sans,
  DM_Serif_Display,
  Abril_Fatface,
  Bangers,
  Righteous,
  Fredoka,
  Dancing_Script,
  Great_Vibes,
  Sacramento,
  Shadows_Into_Light,
  Archivo_Black,
  Alfa_Slab_One,
  Cinzel,
  Staatliches,
  Lilita_One,
} from "next/font/google";
import { FONT_CATALOG, catalogFont, type FontCategory, type FontMood } from "./font-catalog";

/**
 * Fonts for text on products. Layouts store the stable key, never the
 * generated family name, which changes between builds.
 */
const inter = Inter({ subsets: ["latin"], weight: ["400", "700"], display: "swap" });
const montserrat = Montserrat({ subsets: ["latin"], weight: ["400", "800"], display: "swap" });
const anton = Anton({ subsets: ["latin"], weight: "400", display: "swap" });
const bebas = Bebas_Neue({ subsets: ["latin"], weight: "400", display: "swap" });
const oswald = Oswald({ subsets: ["latin"], weight: ["400", "700"], display: "swap" });
const playfair = Playfair_Display({ subsets: ["latin"], weight: ["400", "800"], display: "swap" });
const pacifico = Pacifico({ subsets: ["latin"], weight: "400", display: "swap" });
const marker = Permanent_Marker({ subsets: ["latin"], weight: "400", display: "swap" });
const caveat = Caveat({ subsets: ["latin"], weight: ["400", "700"], display: "swap" });
const lobster = Lobster({ subsets: ["latin"], weight: "400", display: "swap" });
const barlow = Barlow_Condensed({ subsets: ["latin"], weight: ["400", "700"], display: "swap" });
const space = Space_Grotesk({ subsets: ["latin"], weight: ["400", "700"], display: "swap" });
const fraunces = Fraunces({ subsets: ["latin"], weight: ["400", "700"], display: "swap" });
const kalam = Kalam({ subsets: ["latin"], weight: ["400", "700"], display: "swap" });
const tiltWarp = Tilt_Warp({ subsets: ["latin"], weight: "400", display: "swap" });
const poppins = Poppins({ subsets: ["latin"], weight: ["400","700"], display: "swap", preload: false });
const raleway = Raleway({ subsets: ["latin"], weight: ["400","700"], display: "swap", preload: false });
const lato = Lato({ subsets: ["latin"], weight: ["400","700"], display: "swap", preload: false });
const opensans = Open_Sans({ subsets: ["latin"], weight: ["400","700"], display: "swap", preload: false });
const nunito = Nunito({ subsets: ["latin"], weight: ["400","700"], display: "swap", preload: false });
const rubik = Rubik({ subsets: ["latin"], weight: ["400","700"], display: "swap", preload: false });
const workSans = Work_Sans({ subsets: ["latin"], weight: ["400","700"], display: "swap", preload: false });
const dmSans = DM_Sans({ subsets: ["latin"], weight: ["400","700"], display: "swap", preload: false });
const dmSerif = DM_Serif_Display({ subsets: ["latin"], weight: "400", display: "swap", preload: false });
const abril = Abril_Fatface({ subsets: ["latin"], weight: "400", display: "swap", preload: false });
const bangers = Bangers({ subsets: ["latin"], weight: "400", display: "swap", preload: false });
const righteous = Righteous({ subsets: ["latin"], weight: "400", display: "swap", preload: false });
const fredoka = Fredoka({ subsets: ["latin"], weight: ["400","700"], display: "swap", preload: false });
const dancing = Dancing_Script({ subsets: ["latin"], weight: ["400","700"], display: "swap", preload: false });
const greatVibes = Great_Vibes({ subsets: ["latin"], weight: "400", display: "swap", preload: false });
const sacramento = Sacramento({ subsets: ["latin"], weight: "400", display: "swap", preload: false });
const shadows = Shadows_Into_Light({ subsets: ["latin"], weight: "400", display: "swap", preload: false });
const archivoBlack = Archivo_Black({ subsets: ["latin"], weight: "400", display: "swap", preload: false });
const alfaSlab = Alfa_Slab_One({ subsets: ["latin"], weight: "400", display: "swap", preload: false });
const cinzel = Cinzel({ subsets: ["latin"], weight: ["400","700"], display: "swap", preload: false });
const staatliches = Staatliches({ subsets: ["latin"], weight: "400", display: "swap", preload: false });
const lilita = Lilita_One({ subsets: ["latin"], weight: "400", display: "swap", preload: false });

export const PRODUCT_FONTS = [
  { key: "inter", label: "Inter", family: inter.style.fontFamily, bold: true },
  { key: "montserrat", label: "Montserrat", family: montserrat.style.fontFamily, bold: true },
  { key: "anton", label: "Anton", family: anton.style.fontFamily, bold: false },
  { key: "bebas", label: "Bebas Neue", family: bebas.style.fontFamily, bold: false },
  { key: "oswald", label: "Oswald", family: oswald.style.fontFamily, bold: true },
  { key: "playfair", label: "Playfair", family: playfair.style.fontFamily, bold: true },
  { key: "pacifico", label: "Pacifico", family: pacifico.style.fontFamily, bold: false },
  { key: "marker", label: "Marker", family: marker.style.fontFamily, bold: false },
  { key: "caveat", label: "Caveat", family: caveat.style.fontFamily, bold: true },
  { key: "lobster", label: "Lobster", family: lobster.style.fontFamily, bold: false },
  { key: "barlow", label: "Barlow Condensed", family: barlow.style.fontFamily, bold: true },
  { key: "space", label: "Space Grotesk", family: space.style.fontFamily, bold: true },
  { key: "fraunces", label: "Fraunces", family: fraunces.style.fontFamily, bold: true },
  { key: "kalam", label: "Kalam", family: kalam.style.fontFamily, bold: true },
  { key: "tiltWarp", label: "Tilt Warp", family: tiltWarp.style.fontFamily, bold: false },
  { key: "poppins", label: "Poppins", family: poppins.style.fontFamily, bold: true },
  { key: "raleway", label: "Raleway", family: raleway.style.fontFamily, bold: true },
  { key: "lato", label: "Lato", family: lato.style.fontFamily, bold: true },
  { key: "opensans", label: "Open Sans", family: opensans.style.fontFamily, bold: true },
  { key: "nunito", label: "Nunito", family: nunito.style.fontFamily, bold: true },
  { key: "rubik", label: "Rubik", family: rubik.style.fontFamily, bold: true },
  { key: "workSans", label: "Work Sans", family: workSans.style.fontFamily, bold: true },
  { key: "dmSans", label: "DM Sans", family: dmSans.style.fontFamily, bold: true },
  { key: "dmSerif", label: "DM Serif Display", family: dmSerif.style.fontFamily, bold: false },
  { key: "abril", label: "Abril Fatface", family: abril.style.fontFamily, bold: false },
  { key: "bangers", label: "Bangers", family: bangers.style.fontFamily, bold: false },
  { key: "righteous", label: "Righteous", family: righteous.style.fontFamily, bold: false },
  { key: "fredoka", label: "Fredoka", family: fredoka.style.fontFamily, bold: true },
  { key: "dancing", label: "Dancing Script", family: dancing.style.fontFamily, bold: true },
  { key: "greatVibes", label: "Great Vibes", family: greatVibes.style.fontFamily, bold: false },
  { key: "sacramento", label: "Sacramento", family: sacramento.style.fontFamily, bold: false },
  { key: "shadows", label: "Shadows Into Light", family: shadows.style.fontFamily, bold: false },
  { key: "archivoBlack", label: "Archivo Black", family: archivoBlack.style.fontFamily, bold: false },
  { key: "alfaSlab", label: "Alfa Slab One", family: alfaSlab.style.fontFamily, bold: false },
  { key: "cinzel", label: "Cinzel", family: cinzel.style.fontFamily, bold: true },
  { key: "staatliches", label: "Staatliches", family: staatliches.style.fontFamily, bold: false },
  { key: "lilita", label: "Lilita One", family: lilita.style.fontFamily, bold: false },
] as const;

export type ProductFontKey = (typeof PRODUCT_FONTS)[number]["key"];

/** Category and mood for the bundled families, so one picker can browse everything. */
const BUNDLED_META: Record<string, { category: FontCategory; mood: FontMood }> = {
  inter: { category: "Sans", mood: "Modern sans" }, montserrat: { category: "Sans", mood: "Modern sans" },
  anton: { category: "Display", mood: "Bold & impact" }, bebas: { category: "Display", mood: "Bold & impact" },
  oswald: { category: "Sans", mood: "Bold & impact" }, playfair: { category: "Serif", mood: "Elegant serif" },
  pacifico: { category: "Handwriting", mood: "Script & signature" }, marker: { category: "Handwriting", mood: "Handwritten" },
  caveat: { category: "Handwriting", mood: "Handwritten" }, lobster: { category: "Display", mood: "Script & signature" },
  barlow: { category: "Sans", mood: "Bold & impact" }, space: { category: "Sans", mood: "Modern sans" },
  fraunces: { category: "Serif", mood: "Elegant serif" }, kalam: { category: "Handwriting", mood: "Handwritten" },
  tiltWarp: { category: "Display", mood: "Playful & rounded" }, poppins: { category: "Sans", mood: "Modern sans" },
  raleway: { category: "Sans", mood: "Modern sans" }, lato: { category: "Sans", mood: "Modern sans" },
  opensans: { category: "Sans", mood: "Modern sans" }, nunito: { category: "Sans", mood: "Playful & rounded" },
  rubik: { category: "Sans", mood: "Modern sans" }, workSans: { category: "Sans", mood: "Modern sans" },
  dmSans: { category: "Sans", mood: "Modern sans" }, dmSerif: { category: "Serif", mood: "Elegant serif" },
  abril: { category: "Display", mood: "Elegant serif" }, bangers: { category: "Display", mood: "Retro & groovy" },
  righteous: { category: "Display", mood: "Retro & groovy" }, fredoka: { category: "Sans", mood: "Playful & rounded" },
  dancing: { category: "Handwriting", mood: "Script & signature" }, greatVibes: { category: "Handwriting", mood: "Script & signature" },
  sacramento: { category: "Handwriting", mood: "Script & signature" }, shadows: { category: "Handwriting", mood: "Handwritten" },
  archivoBlack: { category: "Sans", mood: "Bold & impact" }, alfaSlab: { category: "Serif", mood: "Bold & impact" },
  cinzel: { category: "Serif", mood: "Elegant serif" }, staatliches: { category: "Display", mood: "Bold & impact" },
  lilita: { category: "Display", mood: "Playful & rounded" },
};

export type StudioFontOption = { key: string; label: string; family: string; bold: boolean; category: FontCategory; mood: FontMood; origin: "bundled" | "catalog" };

/** Every font a person can pick: the bundled families plus the on-demand catalog. */
export const STUDIO_FONTS: readonly StudioFontOption[] = [
  ...PRODUCT_FONTS.map((font): StudioFontOption => ({ key: font.key, label: font.label, family: font.family, bold: font.bold, origin: "bundled", ...(BUNDLED_META[font.key] ?? { category: "Sans" as const, mood: "Modern sans" as const }) })),
  ...FONT_CATALOG.map((font): StudioFontOption => ({ key: font.key, label: font.family, family: `so-${font.id}`, bold: font.bold, category: font.category, mood: font.mood, origin: "catalog" })),
];
const FONT_BY_KEY = new Map(STUDIO_FONTS.map((font) => [font.key, font]));

export function studioFont(key: string | undefined): StudioFontOption {
  return (key && FONT_BY_KEY.get(key)) || FONT_BY_KEY.get("inter")!;
}
export function fontSupportsBold(key: string | undefined): boolean {
  return studioFont(key).bold;
}

export function fontFamily(key: string | undefined): string {
  return studioFont(key).family;
}

const catalogLoads = new Map<string, Promise<void>>();
/** Fetch one catalog family weight from the Fontsource CDN and register it with the document. */
export function loadCatalogFont(key: string, bold = false): Promise<void> {
  const font = catalogFont(key);
  if (!font || typeof document === "undefined" || !("fonts" in document)) return Promise.resolve();
  const weight = bold && font.bold ? 700 : 400;
  const id = `${font.id}:${weight}`;
  const hit = catalogLoads.get(id);
  if (hit) return hit;
  const load = (async () => {
    const face = new FontFace(`so-${font.id}`, `url(https://cdn.jsdelivr.net/fontsource/fonts/${font.id}@latest/latin-${weight}-normal.woff2) format("woff2")`, { weight: String(weight), display: "swap" });
    await face.load();
    document.fonts.add(face);
  })().catch(() => { catalogLoads.delete(id); });
  catalogLoads.set(id, load);
  return load;
}

/** Waits for a font to be usable on a canvas (canvas text won't wait on its own). */
export async function ensureFont(key: string | undefined, bold = false): Promise<void> {
  if (typeof document === "undefined" || !document.fonts) return;
  if (key && catalogFont(key)) {
    await loadCatalogFont(key, bold);
    return;
  }
  try {
    await document.fonts.load(`${bold ? 700 : 400} 40px ${fontFamily(key)}`);
  } catch {
    // Falls back to the default font.
  }
}

/**
 * Fonts a design uses that are not actually available right now (a catalog family that failed to
 * download). Export and save refuse to proceed on these, so a print file never silently swaps fonts.
 */
export async function missingFonts(uses: readonly { key: string | undefined; bold?: boolean }[]): Promise<string[]> {
  if (typeof document === "undefined" || !("fonts" in document)) return [];
  const missing = new Set<string>();
  for (const use of uses) {
    const font = use.key ? catalogFont(use.key) : undefined;
    if (!font) continue;
    const bold = Boolean(use.bold) && font.bold;
    await loadCatalogFont(font.key, bold);
    if (!document.fonts.check(`${bold ? 700 : 400} 20px so-${font.id}`)) missing.add(font.family);
  }
  return [...missing];
}
