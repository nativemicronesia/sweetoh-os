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

export function fontFamily(key: string | undefined): string {
  return (PRODUCT_FONTS.find((f) => f.key === key) ?? PRODUCT_FONTS[0]).family;
}

/** Waits for a font to be usable on a canvas (canvas text won't wait on its own). */
export async function ensureFont(key: string | undefined, bold = false): Promise<void> {
  if (typeof document === "undefined" || !document.fonts) return;
  try {
    await document.fonts.load(`${bold ? 700 : 400} 40px ${fontFamily(key)}`);
  } catch {
    // Falls back to the default font.
  }
}
