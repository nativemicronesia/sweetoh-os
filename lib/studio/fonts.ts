import {
  Anton,
  Bebas_Neue,
  Caveat,
  Inter,
  Lobster,
  Montserrat,
  Oswald,
  Pacifico,
  Permanent_Marker,
  Playfair_Display,
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
