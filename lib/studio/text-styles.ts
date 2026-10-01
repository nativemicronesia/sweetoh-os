/**
 * Ready-made text styles, like Canva's text combinations: one click adds fully styled text.
 * Every field maps to the saved text layer, so the result stays editable.
 */
export type TextStylePreset = {
  id: string;
  label: string;
  sample: string;
  group: "Headlines" | "Script & hand" | "Badges & curves" | "Clean & minimal";
  size: number;
  font: string;
  bold?: boolean;
  italic?: boolean;
  /** Accent color, used only when it stays readable on the product color; otherwise dark/white by garment. */
  accent?: string;
  letterSpacing?: number;
  curve?: number;
  outline?: string;
  outlineWidth?: number;
  textAlign?: "left" | "center" | "right";
  shadow?: { color: string; opacity: number; blur: number; offsetX: number; offsetY: number };
};

export const TEXT_STYLE_PRESETS: readonly TextStylePreset[] = [
  { id: "statement", label: "Statement", sample: "MAKE WAVES", group: "Headlines", size: 76, font: "anton", letterSpacing: 40 },
  { id: "impact", label: "Impact", sample: "BIG ENERGY", group: "Headlines", size: 70, font: "g-bowlby-one", letterSpacing: 10 },
  { id: "poster", label: "Poster", sample: "Island Time", group: "Headlines", size: 72, font: "g-shrikhand", accent: "#c8553d" },
  { id: "stencil", label: "Stencil", sample: "OUTPOST 96", group: "Headlines", size: 60, font: "g-stardos-stencil", bold: true, letterSpacing: 60 },
  { id: "pop", label: "Pop outline", sample: "Wow!", group: "Headlines", size: 84, font: "bangers", accent: "#f2b84b", outline: "#173e39", outlineWidth: 6 },
  { id: "groovy", label: "Groovy", sample: "Good Vibes", group: "Headlines", size: 66, font: "g-chango", accent: "#e8795f" },
  { id: "aloha", label: "Aloha script", sample: "Aloha", group: "Script & hand", size: 84, font: "pacifico", accent: "#246d5b" },
  { id: "signature", label: "Signature", sample: "Sweet Life", group: "Script & hand", size: 76, font: "g-mr-dafoe" },
  { id: "lettered", label: "Hand lettered", sample: "salt & sun", group: "Script & hand", size: 72, font: "caveat", bold: true },
  { id: "brush", label: "Brush", sample: "Ocean Soul", group: "Script & hand", size: 68, font: "g-kaushan-script" },
  { id: "romantic", label: "Romantic", sample: "Forever", group: "Script & hand", size: 80, font: "greatVibes" },
  { id: "arch", label: "Arch badge", sample: "SWEET'OH ISLAND", group: "Badges & curves", size: 44, font: "cinzel", bold: true, letterSpacing: 80, curve: 60 },
  { id: "bowl", label: "Bowl", sample: "SALT & SEA", group: "Badges & curves", size: 46, font: "g-bebas-neue", letterSpacing: 120, curve: -60 },
  { id: "ring-script", label: "Arc script", sample: "Pacific Dreams", group: "Badges & curves", size: 52, font: "dancing", bold: true, curve: 45, accent: "#246d5b" },
  { id: "serif", label: "Elegant", sample: "Pacific Dreams", group: "Clean & minimal", size: 56, font: "playfair", bold: true },
  { id: "caps", label: "Spaced caps", sample: "ISLAND LIFE", group: "Clean & minimal", size: 30, font: "montserrat", letterSpacing: 320 },
  { id: "round", label: "Soft round", sample: "Stay Sweet", group: "Clean & minimal", size: 58, font: "fredoka", bold: true },
  { id: "typewriter", label: "Typewriter", sample: "est. 2024", group: "Clean & minimal", size: 36, font: "g-special-elite" },
];

function luminance(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const c = [16, 8, 0].map((s) => {
    const v = ((n >> s) & 255) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
export function contrastRatio(a: string, b: string) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** Pick the preset's accent when it reads on the surface color, else dark/white. */
export function presetTextColor(preset: TextStylePreset, surfaceHex: string | null): string {
  const surface = surfaceHex && /^#[0-9a-f]{6}$/i.test(surfaceHex) ? surfaceHex : "#ffffff";
  if (preset.accent && contrastRatio(preset.accent, surface) >= 3) return preset.accent;
  return contrastRatio("#101828", surface) >= contrastRatio("#ffffff", surface) ? "#101828" : "#ffffff";
}
