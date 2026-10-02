/**
 * Ready-made text styles, like Canva's text combinations: one click adds fully styled text.
 * Every field maps to the saved text layer, so the result stays editable.
 */
export type TextStylePreset = {
  id: string;
  label: string;
  sample: string;
  group: "Headlines" | "Retro & groovy" | "Script & hand" | "Elegant" | "Outline & shadow" | "Badges & curves" | "Clean & minimal";
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
  { id: "bowl", label: "Bowl", sample: "SALT & SEA", group: "Badges & curves", size: 46, font: "bebas", letterSpacing: 120, curve: -60 },
  { id: "ring-script", label: "Arc script", sample: "Pacific Dreams", group: "Badges & curves", size: 52, font: "dancing", bold: true, curve: 45, accent: "#246d5b" },
  { id: "serif", label: "Elegant", sample: "Pacific Dreams", group: "Clean & minimal", size: 56, font: "playfair", bold: true },
  { id: "caps", label: "Spaced caps", sample: "ISLAND LIFE", group: "Clean & minimal", size: 30, font: "montserrat", letterSpacing: 320 },
  { id: "round", label: "Soft round", sample: "Stay Sweet", group: "Clean & minimal", size: 58, font: "fredoka", bold: true },
  { id: "typewriter", label: "Typewriter", sample: "est. 2024", group: "Clean & minimal", size: 36, font: "g-special-elite" },
  { id: "heavy", label: "Heavy", sample: "HEAVY DUTY", group: "Headlines", size: 64, font: "archivoBlack" },
  { id: "condensed", label: "Condensed", sample: "CONDENSED", group: "Headlines", size: 96, font: "g-league-gothic", letterSpacing: 50 },
  { id: "tall", label: "Tall", sample: "TALL ORDER", group: "Headlines", size: 110, font: "g-six-caps", letterSpacing: 90 },
  { id: "army", label: "Army", sample: "ARMY SURPLUS", group: "Headlines", size: 56, font: "g-black-ops-one", letterSpacing: 30 },
  { id: "slab", label: "Slab", sample: "Big Slab", group: "Headlines", size: 66, font: "alfaSlab" },
  { id: "sport", label: "Sport", sample: "SPORT", group: "Headlines", size: 76, font: "g-russo-one", italic: true, letterSpacing: 30 },
  { id: "shoulders", label: "Big shoulders", sample: "CHICAGO", group: "Headlines", size: 72, font: "g-big-shoulders-display", bold: true, letterSpacing: 40 },
  { id: "adventure", label: "Adventure", sample: "ADVENTURE", group: "Headlines", size: 64, font: "g-fjalla-one", letterSpacing: 60 },
  { id: "passion", label: "Passion", sample: "PASSION", group: "Headlines", size: 70, font: "g-passion-one", accent: "#e8795f" },
  { id: "lucky", label: "Lucky", sample: "Lucky!", group: "Headlines", size: 84, font: "g-luckiest-guy", accent: "#f2b84b", outline: "#173e39", outlineWidth: 6 },
  { id: "farout", label: "Far out", sample: "Far Out", group: "Retro & groovy", size: 72, font: "g-chango", accent: "#e8795f", outline: "#173e39", outlineWidth: 5 },
  { id: "retro", label: "Retro", sample: "Retro", group: "Retro & groovy", size: 76, font: "g-shrikhand", accent: "#f2b84b", shadow: { color: "#173e39", opacity: 1, blur: 0, offsetX: 6, offsetY: 6 } },
  { id: "disco", label: "Disco", sample: "DISCO", group: "Retro & groovy", size: 64, font: "g-monoton", accent: "#7c5cc4" },
  { id: "showtime", label: "Showtime", sample: "Showtime", group: "Retro & groovy", size: 64, font: "g-limelight", accent: "#c8553d" },
  { id: "inline", label: "Inline", sample: "OPEN", group: "Retro & groovy", size: 74, font: "g-bungee-inline", accent: "#2a86c8" },
  { id: "titan", label: "Titan", sample: "Titan", group: "Retro & groovy", size: 74, font: "g-titan-one", accent: "#e8795f", outline: "#173e39", outlineWidth: 6 },
  { id: "sigmar", label: "Sigmar", sample: "Sigmar", group: "Retro & groovy", size: 72, font: "g-sigmar-one", accent: "#2aa6a0" },
  { id: "coiny", label: "Cute", sample: "So Cute", group: "Retro & groovy", size: 68, font: "g-coiny", accent: "#e7407c" },
  { id: "lemon", label: "Lemon", sample: "Lemon", group: "Retro & groovy", size: 64, font: "g-lemon", accent: "#d9822b" },
  { id: "cookie", label: "Cookie", sample: "Sweet", group: "Retro & groovy", size: 84, font: "g-cookie", accent: "#c8553d" },
  { id: "yellowtail", label: "Yellowtail", sample: "Sunday", group: "Script & hand", size: 80, font: "g-yellowtail", accent: "#e8795f" },
  { id: "courgette", label: "Courgette", sample: "Courgette", group: "Script & hand", size: 60, font: "g-courgette" },
  { id: "parisienne", label: "Parisienne", sample: "Parisienne", group: "Script & hand", size: 72, font: "g-parisienne", accent: "#7c5cc4" },
  { id: "lobster2", label: "Lobster two", sample: "Lobster Two", group: "Script & hand", size: 64, font: "g-lobster-two", accent: "#2a86c8", bold: true },
  { id: "damion", label: "Damion", sample: "Damion", group: "Script & hand", size: 80, font: "g-damion" },
  { id: "alexbrush", label: "Alex brush", sample: "Alex Brush", group: "Script & hand", size: 84, font: "g-alex-brush", accent: "#246d5b" },
  { id: "playball", label: "Playball", sample: "Playball", group: "Script & hand", size: 76, font: "g-playball", accent: "#c8102e" },
  { id: "satisfy", label: "Satisfy", sample: "Satisfy", group: "Script & hand", size: 72, font: "g-satisfy" },
  { id: "amatic", label: "Amatic", sample: "AMATIC", group: "Script & hand", size: 90, font: "g-amatic-sc", bold: true, letterSpacing: 60 },
  { id: "indie", label: "Indie flower", sample: "Indie Flower", group: "Script & hand", size: 60, font: "g-indie-flower", accent: "#2aa6a0" },
  { id: "gloria", label: "Gloria", sample: "Gloria", group: "Script & hand", size: 54, font: "g-gloria-hallelujah" },
  { id: "rocksalt", label: "Rock salt", sample: "Rock Salt", group: "Script & hand", size: 50, font: "g-rock-salt" },
  { id: "cormorant", label: "Cormorant", sample: "Cormorant", group: "Elegant", size: 70, font: "g-cormorant-garamond", italic: true, bold: true },
  { id: "baskerville", label: "Baskerville", sample: "Baskerville", group: "Elegant", size: 60, font: "g-libre-baskerville" },
  { id: "bodoni", label: "Bodoni", sample: "Bodoni", group: "Elegant", size: 64, font: "g-bodoni-moda", bold: true },
  { id: "prata", label: "Prata", sample: "Prata", group: "Elegant", size: 64, font: "g-prata" },
  { id: "gloock", label: "Gloock", sample: "Gloock", group: "Elegant", size: 72, font: "g-gloock" },
  { id: "youngserif", label: "Young serif", sample: "Young Serif", group: "Elegant", size: 66, font: "g-young-serif", accent: "#8a5a3c" },
  { id: "dmserif", label: "DM serif", sample: "DM Serif", group: "Elegant", size: 68, font: "dmSerif" },
  { id: "yeseva", label: "Yeseva", sample: "Yeseva", group: "Elegant", size: 64, font: "g-yeseva-one", accent: "#8a5a3c" },
  { id: "hardshadow", label: "Hard shadow", sample: "SHADOW", group: "Outline & shadow", size: 72, font: "g-bowlby-one", accent: "#e8795f", shadow: { color: "#173e39", opacity: 1, blur: 0, offsetX: 6, offsetY: 6 } },
  { id: "softshadow", label: "Soft shadow", sample: "Float", group: "Outline & shadow", size: 76, font: "fredoka", bold: true, shadow: { color: "#101828", opacity: 0.35, blur: 14, offsetX: 0, offsetY: 6 } },
  { id: "neon", label: "Neon glow", sample: "NEON", group: "Outline & shadow", size: 66, font: "g-bungee", accent: "#2aa6a0", shadow: { color: "#2aa6a0", opacity: 0.9, blur: 18, offsetX: 0, offsetY: 0 } },
  { id: "stickertext", label: "Sticker text", sample: "STICKER", group: "Outline & shadow", size: 72, font: "bangers", accent: "#f2b84b", outline: "#173e39", outlineWidth: 8, shadow: { color: "#173e39", opacity: 1, blur: 0, offsetX: 6, offsetY: 6 } },
  { id: "blockoutline", label: "Block outline", sample: "BLOCK", group: "Outline & shadow", size: 72, font: "anton", accent: "#e8795f", outline: "#173e39", outlineWidth: 7 },
  { id: "arch2", label: "Sunset arch", sample: "SUNSET CLUB", group: "Badges & curves", size: 50, font: "g-bowlby-one", curve: 40, letterSpacing: 40 },
  { id: "bowl2", label: "Surf bowl", sample: "SURF SHOP", group: "Badges & curves", size: 54, font: "anton", curve: -45, letterSpacing: 60 },
  { id: "archserif", label: "Serif arc", sample: "Pacific Coast", group: "Badges & curves", size: 52, font: "playfair", bold: true, curve: 35 },
  { id: "gentle", label: "Gentle wave", sample: "good vibes", group: "Badges & curves", size: 64, font: "pacifico", curve: 22, accent: "#2aa6a0" },
  { id: "light", label: "Light", sample: "Simple", group: "Clean & minimal", size: 64, font: "inter", letterSpacing: 10 },
  { id: "wander", label: "Wander", sample: "WANDER", group: "Clean & minimal", size: 56, font: "montserrat", letterSpacing: 200, bold: true },
  { id: "mono", label: "Mono", sample: "mono_type", group: "Clean & minimal", size: 44, font: "g-space-mono" },
  { id: "thincaps", label: "Thin caps", sample: "EST. 1998", group: "Clean & minimal", size: 36, font: "g-josefin-sans", letterSpacing: 420 },
  { id: "posterbebas", label: "Poster", sample: "POSTER", group: "Clean & minimal", size: 84, font: "bebas", letterSpacing: 60 },
  { id: "rounded2", label: "Rounded", sample: "Rounded", group: "Clean & minimal", size: 60, font: "nunito", bold: true },
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
