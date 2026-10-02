/**
 * Starter templates: ready-made layouts built from Studio text, shapes and library art.
 * Positions are fractions of the artboard (center-anchored), sizes are fractions of its
 * shorter side, so one template fits any artboard or print area. Applying one creates
 * ordinary editable layers; nothing about a template is special once it is on the canvas.
 */
export type TemplateTone = "ink" | string;

export type TemplateElement =
  | { type: "text"; text: string; font: string; size: number; cx: number; cy: number; color: TemplateTone; bold?: boolean; italic?: boolean; letterSpacing?: number; curve?: number; /** Follow a circle centered at (cx, cy): baseline radius as a fraction of the shorter side. */ arc?: { radius: number; side: "top" | "bottom" }; outline?: string; outlineWidth?: number }
  | { type: "graphic"; id: string; cx: number; cy: number; w: number }
  | { type: "shape"; shape: "circle" | "rect" | "rounded" | "star" | "burst" | "heart" | "line"; cx: number; cy: number; w: number; h?: number; fill?: string; stroke?: string; strokeWidth?: number };

export type TemplateCategory = "Badges" | "Typography" | "Illustration" | "Stickers";
export type StudioTemplate = { id: string; name: string; category: TemplateCategory; /** False when the template paints its own background, so its colors must not be adapted to the product. */ adaptColors?: boolean; elements: readonly TemplateElement[] };

const TEAL = "#1f6f61", DEEP = "#173e39", GOLD = "#f2b84b", CORAL = "#e8795f", LAGOON = "#2aa6a0", CREAM = "#fff8ea", NAVY = "#12263f";

export const STUDIO_TEMPLATES: readonly StudioTemplate[] = [
  { id: "island-sunrise", name: "Island sunrise", category: "Illustration", elements: [
    { type: "shape", shape: "circle", cx: 0.5, cy: 0.47, w: 0.7, fill: CORAL },
    { type: "shape", shape: "circle", cx: 0.5, cy: 0.47, w: 0.52, fill: GOLD },
    { type: "graphic", id: "so-wave-v1", cx: 0.5, cy: 0.6, w: 0.62 },
    { type: "text", text: "ISLAND TIME", font: "cinzel", size: 0.06, cx: 0.5, cy: 0.13, color: "ink", bold: true, letterSpacing: 140 },
    { type: "text", text: "Aloha", font: "pacifico", size: 0.13, cx: 0.5, cy: 0.88, color: TEAL },
  ] },
  { id: "salt-and-sea", name: "Salt & sea", category: "Typography", elements: [
    { type: "text", text: "EST. ON THE PACIFIC", font: "montserrat", size: 0.03, cx: 0.5, cy: 0.2, color: "ink", letterSpacing: 380 },
    { type: "text", text: "SALT", font: "anton", size: 0.25, cx: 0.5, cy: 0.38, color: "ink" },
    { type: "text", text: "& sea", font: "pacifico", size: 0.16, cx: 0.5, cy: 0.56, color: CORAL },
    { type: "text", text: "SEA", font: "anton", size: 0.25, cx: 0.5, cy: 0.74, color: LAGOON },
    { type: "text", text: "SALTWATER SOUL", font: "montserrat", size: 0.028, cx: 0.5, cy: 0.9, color: "ink", letterSpacing: 380 },
  ] },
  { id: "palm-badge", name: "Palm badge", category: "Badges", elements: [
    { type: "shape", shape: "circle", cx: 0.5, cy: 0.5, w: 0.84, stroke: DEEP, strokeWidth: 8 },
    { type: "shape", shape: "circle", cx: 0.5, cy: 0.5, w: 0.76, stroke: DEEP, strokeWidth: 3 },
    { type: "graphic", id: "so-tropical-flourish-v1", cx: 0.5, cy: 0.5, w: 0.44 },
    { type: "text", text: "TROPICAL SOUL", font: "cinzel", size: 0.05, cx: 0.5, cy: 0.5, color: DEEP, bold: true, letterSpacing: 140, arc: { radius: 0.3, side: "top" } },
    { type: "text", text: "ISLAND LIFE", font: "cinzel", size: 0.05, cx: 0.5, cy: 0.5, color: DEEP, bold: true, letterSpacing: 140, arc: { radius: 0.32, side: "bottom" } },
  ] },
  { id: "retro-stack", name: "Retro stack", category: "Typography", elements: [
    { type: "text", text: "GOOD", font: "righteous", size: 0.2, cx: 0.5, cy: 0.28, color: CORAL },
    { type: "text", text: "VIBES", font: "righteous", size: 0.2, cx: 0.5, cy: 0.47, color: GOLD, outline: DEEP, outlineWidth: 6 },
    { type: "text", text: "ONLY", font: "righteous", size: 0.2, cx: 0.5, cy: 0.66, color: LAGOON },
    { type: "shape", shape: "line", cx: 0.5, cy: 0.8, w: 0.5, stroke: DEEP, strokeWidth: 6 },
    { type: "text", text: "SUMMER · ALL YEAR", font: "montserrat", size: 0.028, cx: 0.5, cy: 0.87, color: "ink", letterSpacing: 300 },
  ] },
  { id: "minimal-quote", name: "Minimal quote", category: "Typography", elements: [
    { type: "text", text: "ISLAND NOTES", font: "montserrat", size: 0.028, cx: 0.5, cy: 0.26, color: "ink", letterSpacing: 420 },
    { type: "text", text: "Life is better", font: "playfair", size: 0.1, cx: 0.5, cy: 0.42, color: "ink", bold: true },
    { type: "text", text: "at the beach", font: "playfair", size: 0.1, cx: 0.5, cy: 0.54, color: TEAL, bold: true, italic: true },
    { type: "shape", shape: "line", cx: 0.5, cy: 0.68, w: 0.18, stroke: GOLD, strokeWidth: 6 },
  ] },
  { id: "sticker-pop", name: "Sticker pop", category: "Stickers", adaptColors: false, elements: [
    { type: "shape", shape: "burst", cx: 0.5, cy: 0.5, w: 0.86, fill: GOLD, stroke: DEEP, strokeWidth: 8 },
    { type: "text", text: "WOW!", font: "bangers", size: 0.24, cx: 0.5, cy: 0.5, color: CORAL, outline: DEEP, outlineWidth: 8 },
  ] },
  { id: "wave-rider", name: "Wave rider", category: "Illustration", elements: [
    { type: "text", text: "RIDE THE", font: "montserrat", size: 0.04, cx: 0.5, cy: 0.22, color: "ink", bold: true, letterSpacing: 360 },
    { type: "text", text: "WAVE", font: "anton", size: 0.22, cx: 0.5, cy: 0.35, color: "ink" },
    { type: "graphic", id: "so-wave-v1", cx: 0.5, cy: 0.56, w: 0.7 },
    { type: "graphic", id: "so-wave-v1", cx: 0.5, cy: 0.67, w: 0.7 },
    { type: "graphic", id: "so-wave-v1", cx: 0.5, cy: 0.78, w: 0.7 },
  ] },
  { id: "tropical-bloom", name: "Tropical bloom", category: "Illustration", elements: [
    { type: "graphic", id: "so-leaf-v1", cx: 0.26, cy: 0.38, w: 0.3 },
    { type: "graphic", id: "so-leaf-v1", cx: 0.74, cy: 0.38, w: 0.3 },
    { type: "graphic", id: "so-flower-v1", cx: 0.5, cy: 0.38, w: 0.4 },
    { type: "text", text: "Aloha", font: "g-mr-dafoe", size: 0.2, cx: 0.5, cy: 0.7, color: TEAL },
    { type: "text", text: "FROM THE ISLANDS", font: "montserrat", size: 0.03, cx: 0.5, cy: 0.86, color: "ink", letterSpacing: 380 },
  ] },
  { id: "est-badge", name: "Established badge", category: "Badges", adaptColors: false, elements: [
    { type: "shape", shape: "circle", cx: 0.5, cy: 0.5, w: 0.84, fill: TEAL },
    { type: "shape", shape: "circle", cx: 0.5, cy: 0.5, w: 0.76, stroke: CREAM, strokeWidth: 4 },
    { type: "text", text: "EST.", font: "montserrat", size: 0.045, cx: 0.5, cy: 0.38, color: CREAM, bold: true, letterSpacing: 300 },
    { type: "text", text: "2024", font: "anton", size: 0.2, cx: 0.5, cy: 0.5, color: CREAM },
    { type: "text", text: "SWEET'OH ISLAND", font: "cinzel", size: 0.04, cx: 0.5, cy: 0.5, color: CREAM, bold: true, letterSpacing: 120, arc: { radius: 0.3, side: "bottom" } },
    { type: "text", text: "HANDMADE WITH ALOHA", font: "cinzel", size: 0.036, cx: 0.5, cy: 0.5, color: CREAM, bold: true, letterSpacing: 100, arc: { radius: 0.27, side: "top" } },
  ] },
  { id: "sunshine-smile", name: "Sunshine smile", category: "Illustration", elements: [
    { type: "graphic", id: "so-sunshine-v1", cx: 0.5, cy: 0.42, w: 0.72 },
    { type: "text", text: "Stay Sunny", font: "pacifico", size: 0.13, cx: 0.5, cy: 0.82, color: CORAL },
  ] },
  { id: "arch-welcome", name: "Arch welcome", category: "Badges", elements: [
    { type: "graphic", id: "so-arch-v1", cx: 0.5, cy: 0.38, w: 0.5 },
    { type: "text", text: "Welcome", font: "playfair", size: 0.1, cx: 0.5, cy: 0.74, color: "ink", bold: true },
    { type: "text", text: "to the island", font: "g-kaushan-script", size: 0.075, cx: 0.5, cy: 0.84, color: TEAL },
  ] },
  { id: "rainbow-dreams", name: "Rainbow dreams", category: "Illustration", elements: [
    { type: "graphic", id: "so-rainbow-v1", cx: 0.5, cy: 0.36, w: 0.74 },
    { type: "text", text: "good things", font: "g-kaushan-script", size: 0.1, cx: 0.5, cy: 0.72, color: "ink" },
    { type: "text", text: "take time", font: "g-kaushan-script", size: 0.1, cx: 0.5, cy: 0.84, color: CORAL },
  ] },
  { id: "night-market", name: "Night market", category: "Typography", elements: [
    { type: "text", text: "NIGHT", font: "bebas", size: 0.27, cx: 0.5, cy: 0.3, color: "ink", letterSpacing: 40 },
    { type: "text", text: "MARKET", font: "bebas", size: 0.27, cx: 0.5, cy: 0.5, color: GOLD, letterSpacing: 40 },
    { type: "text", text: "FRIDAYS · LIVE MUSIC · LOCAL EATS", font: "montserrat", size: 0.026, cx: 0.5, cy: 0.67, color: "ink", letterSpacing: 260 },
    { type: "graphic", id: "so-sunburst-v1", cx: 0.5, cy: 0.82, w: 0.18 },
  ] },
  { id: "pacific-seal", name: "Pacific seal", category: "Badges", adaptColors: false, elements: [
    { type: "shape", shape: "burst", cx: 0.5, cy: 0.5, w: 0.84, fill: NAVY },
    { type: "shape", shape: "circle", cx: 0.5, cy: 0.5, w: 0.66, stroke: GOLD, strokeWidth: 5 },
    { type: "text", text: "PACIFIC", font: "cinzel", size: 0.075, cx: 0.5, cy: 0.42, color: GOLD, bold: true, letterSpacing: 120 },
    { type: "text", text: "FINEST", font: "cinzel", size: 0.075, cx: 0.5, cy: 0.56, color: CREAM, bold: true, letterSpacing: 120 },
  ] },
];

export const TEMPLATE_CATEGORIES: readonly TemplateCategory[] = ["Badges", "Typography", "Illustration", "Stickers"];
