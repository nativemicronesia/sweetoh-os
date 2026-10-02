/**
 * Text effects: finishes that sit on top of a text layer (depth, glow, metal,
 * worn print, halftone, die-cut…). An effect is plain data (`TextEffect`), so
 * the editor, saved designs, templates and the AI layer all describe one the
 * same way, and the renderer below is the only place that draws it.
 *
 * The renderer works on a canvas: it asks the caller to paint the text (the
 * editor paints a Fabric text object, the gallery paints a sample word), builds
 * the finish from a few tinted copies and masks, and returns one bitmap sized
 * to the print resolution it was asked for. Nothing here depends on Fabric.
 */
export const TEXT_EFFECT_KINDS = ["extrude", "longshadow", "pop", "echo", "emboss", "neon", "glow", "foil", "tide", "worn", "halftone", "diecut", "line", "glitch"] as const;
export type TextEffectKind = (typeof TEXT_EFFECT_KINDS)[number];

export type TextEffect = {
  kind: TextEffectKind;
  /** Main effect color: extrusion, glow, metal highlight, gradient start… */
  color?: string;
  /** Second color: shadow side of metal, gradient end, die-cut keyline… */
  accent?: string;
  /** 0–100: how much of the effect (depth, glow size, wear…). */
  amount?: number;
};

export type TextEffectGroup = "Depth" | "Glow" | "Metal & color" | "Texture" | "Edge & echo";

export type TextEffectPreset = {
  id: string;
  name: string;
  group: TextEffectGroup;
  effect: TextEffect;
  /** Face color the preset looks right with; applied together with the effect. */
  face: string;
};

/** Island-palette presets. Every effect has several, so there is always a good starting point. */
export const TEXT_EFFECT_PRESETS: readonly TextEffectPreset[] = [
  { id: "block-lagoon", name: "Block · Lagoon", group: "Depth", effect: { kind: "extrude", color: "#0f6e6a", amount: 46 }, face: "#fff4d6" },
  { id: "block-coral", name: "Block · Coral", group: "Depth", effect: { kind: "extrude", color: "#a8321f", amount: 46 }, face: "#ffd9a8" },
  { id: "block-night", name: "Block · Night tide", group: "Depth", effect: { kind: "extrude", color: "#0b1f3a", amount: 60 }, face: "#f6c445" },
  { id: "long-palm", name: "Long shadow · Palm", group: "Depth", effect: { kind: "longshadow", color: "#1f7048", amount: 62 }, face: "#fffaf0" },
  { id: "long-dusk", name: "Long shadow · Dusk", group: "Depth", effect: { kind: "longshadow", color: "#5b2a86", amount: 62 }, face: "#ffe3a3" },
  { id: "pop-ink", name: "Pop shadow · Ink", group: "Depth", effect: { kind: "pop", color: "#101c2e", amount: 50 }, face: "#ffd23f" },
  { id: "pop-reef", name: "Pop shadow · Reef", group: "Depth", effect: { kind: "pop", color: "#0f6e6a", amount: 50 }, face: "#ffe9c2" },
  { id: "chisel", name: "Chiseled", group: "Depth", effect: { kind: "emboss", color: "#ffffff", accent: "#10241f", amount: 50 }, face: "#c9b88f" },

  { id: "neon-hibiscus", name: "Neon · Hibiscus", group: "Glow", effect: { kind: "neon", color: "#ff3d8b", amount: 55 }, face: "#fff0f6" },
  { id: "neon-lagoon", name: "Neon · Lagoon", group: "Glow", effect: { kind: "neon", color: "#18e0d0", amount: 55 }, face: "#eafffb" },
  { id: "neon-sun", name: "Neon · Sun", group: "Glow", effect: { kind: "neon", color: "#ffb100", amount: 55 }, face: "#fff7d6" },
  { id: "glow-sea", name: "Glow · Sea", group: "Glow", effect: { kind: "glow", color: "#40d9ff", amount: 55 }, face: "#ffffff" },
  { id: "glow-ember", name: "Glow · Ember", group: "Glow", effect: { kind: "glow", color: "#ff6b2c", amount: 55 }, face: "#fff2e2" },

  { id: "foil-gold", name: "Gold foil", group: "Metal & color", effect: { kind: "foil", color: "#f7d774", accent: "#8a5a0c", amount: 50 }, face: "#d4a017" },
  { id: "foil-silver", name: "Silver foil", group: "Metal & color", effect: { kind: "foil", color: "#e8edf2", accent: "#6a7683", amount: 50 }, face: "#c0c8d0" },
  { id: "foil-rose", name: "Rose gold", group: "Metal & color", effect: { kind: "foil", color: "#f4c1b0", accent: "#97503f", amount: 50 }, face: "#d99a86" },
  { id: "foil-pearl", name: "Pearl shell", group: "Metal & color", effect: { kind: "foil", color: "#f4efe6", accent: "#7fb7b0", amount: 50 }, face: "#e6dccb" },
  { id: "tide-sunset", name: "Sunset tide", group: "Metal & color", effect: { kind: "tide", color: "#ffbf3f", accent: "#e8325a", amount: 25 }, face: "#f26b5b" },
  { id: "tide-reef", name: "Reef tide", group: "Metal & color", effect: { kind: "tide", color: "#7ff0c5", accent: "#0f5fa8", amount: 25 }, face: "#18a8a0" },
  { id: "tide-dusk", name: "Dusk tide", group: "Metal & color", effect: { kind: "tide", color: "#ff8fb1", accent: "#4b2a8f", amount: 25 }, face: "#8a4fbf" },

  { id: "worn-ink", name: "Worn print", group: "Texture", effect: { kind: "worn", amount: 60 }, face: "#16322d" },
  { id: "worn-heavy", name: "Heavy wear", group: "Texture", effect: { kind: "worn", amount: 92 }, face: "#8a2d1d" },
  { id: "halftone-fade", name: "Halftone fade", group: "Texture", effect: { kind: "halftone", amount: 55 }, face: "#102a4c" },
  { id: "halftone-bold", name: "Halftone bold", group: "Texture", effect: { kind: "halftone", amount: 85 }, face: "#c4361f" },

  { id: "diecut-white", name: "Die-cut · White", group: "Edge & echo", effect: { kind: "diecut", color: "#ffffff", amount: 45 }, face: "#0f6e6a" },
  { id: "diecut-keyline", name: "Die-cut · Keyline", group: "Edge & echo", effect: { kind: "diecut", color: "#fff4d6", accent: "#0b1f3a", amount: 45 }, face: "#e8325a" },
  { id: "line-clean", name: "Line only", group: "Edge & echo", effect: { kind: "line", color: "#0f6e6a", amount: 40 }, face: "#0f6e6a" },
  { id: "line-sun", name: "Line · Sun", group: "Edge & echo", effect: { kind: "line", color: "#f2a900", amount: 40 }, face: "#f2a900" },
  { id: "echo-wave", name: "Echo · Wave", group: "Edge & echo", effect: { kind: "echo", color: "#18a8a0", amount: 50 }, face: "#102a4c" },
  { id: "echo-sun", name: "Echo · Sunrise", group: "Edge & echo", effect: { kind: "echo", color: "#f26b5b", amount: 50 }, face: "#fff4d6" },
  { id: "glitch", name: "Signal glitch", group: "Edge & echo", effect: { kind: "glitch", color: "#ff2e63", accent: "#08d9d6", amount: 50 }, face: "#ffffff" },
];

export const TEXT_EFFECT_GROUPS: readonly TextEffectGroup[] = ["Depth", "Glow", "Metal & color", "Texture", "Edge & echo"];

export const TEXT_EFFECT_NAMES: Record<TextEffectKind, string> = {
  extrude: "Block 3D",
  longshadow: "Long shadow",
  pop: "Pop shadow",
  echo: "Echo",
  emboss: "Chiseled",
  neon: "Neon",
  glow: "Glow",
  foil: "Foil",
  tide: "Tide gradient",
  worn: "Worn print",
  halftone: "Halftone",
  diecut: "Die-cut",
  line: "Line only",
  glitch: "Glitch",
};

/** Which colors the editor should offer for an effect (undefined = not used). */
export const TEXT_EFFECT_CONTROLS: Record<TextEffectKind, { color?: string; accent?: string; amount: string }> = {
  extrude: { color: "Side color", amount: "Depth" },
  longshadow: { color: "Shadow color", amount: "Length" },
  pop: { color: "Shadow color", amount: "Offset" },
  echo: { color: "Echo color", amount: "Spacing" },
  emboss: { color: "Light edge", accent: "Dark edge", amount: "Relief" },
  neon: { color: "Glow color", amount: "Glow" },
  glow: { color: "Glow color", amount: "Glow" },
  foil: { color: "Highlight", accent: "Shadow", amount: "Shine" },
  tide: { color: "From", accent: "To", amount: "Angle" },
  worn: { amount: "Wear" },
  halftone: { amount: "Dot size" },
  diecut: { color: "Border color", accent: "Keyline", amount: "Border" },
  line: { color: "Line color", amount: "Weight" },
  glitch: { color: "Split color A", accent: "Split color B", amount: "Split" },
};

export const TEXT_WARP_KINDS = ["wave", "flag", "bulge", "rise", "slope", "ripple"] as const;
export type TextWarpKind = (typeof TEXT_WARP_KINDS)[number];
/** Reshapes the finished text bitmap. amount -100..100; negative flips direction. */
export type TextWarp = { kind: TextWarpKind; amount: number };

export const TEXT_WARP_NAMES: Record<TextWarpKind, string> = { wave: "Wave", flag: "Flag", bulge: "Bulge", rise: "Rise", slope: "Slope", ripple: "Ripple" };
export const TEXT_WARP_PRESETS: readonly { id: string; name: string; warp: TextWarp }[] = [
  { id: "wave", name: "Wave", warp: { kind: "wave", amount: 55 } },
  { id: "flag", name: "Flag", warp: { kind: "flag", amount: 60 } },
  { id: "bulge", name: "Bulge", warp: { kind: "bulge", amount: 55 } },
  { id: "pinch", name: "Pinch", warp: { kind: "bulge", amount: -45 } },
  { id: "rise", name: "Rise", warp: { kind: "rise", amount: 55 } },
  { id: "fall", name: "Fall", warp: { kind: "rise", amount: -55 } },
  { id: "slope", name: "Slope up", warp: { kind: "slope", amount: -55 } },
  { id: "ripple", name: "Ripple", warp: { kind: "ripple", amount: 60 } },
];

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
const HEX = /^#[0-9a-f]{6}$/i;

function channels(hex: string): [number, number, number] {
  const n = parseInt((HEX.test(hex) ? hex : "#000000").slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function toHex([r, g, b]: [number, number, number]): string {
  return `#${[r, g, b].map((v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, "0")).join("")}`;
}
function mix(a: string, b: string, t: number): string {
  const x = channels(a), y = channels(b);
  return toHex([x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t]);
}
const lighten = (hex: string, t: number) => mix(hex, "#ffffff", t);
const darken = (hex: string, t: number) => mix(hex, "#000000", t);
const withAlpha = (hex: string, alpha: number) => {
  const [r, g, b] = channels(hex);
  return `rgba(${r},${g},${b},${alpha})`;
};

/** Small deterministic generator so the same design always draws the same speckles. */
function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const TILE = 512;
const tiles = new Map<string, HTMLCanvasElement>();
/** Seamless-ish speckle, blotch and scratch tile whose alpha is what gets worn away. */
function wearTile(wear: number, res: number): HTMLCanvasElement {
  const bucket = Math.round(clamp(wear, 0, 100) / 5);
  const cacheKey = `${bucket}@${res}`;
  const hit = tiles.get(cacheKey);
  if (hit) return hit;
  const canvas = document.createElement("canvas");
  canvas.width = TILE * res;
  canvas.height = TILE * res;
  const g = canvas.getContext("2d")!;
  g.scale(res, res);
  const rand = seeded(1049 + bucket * 31);
  const w = bucket / 20;
  const dot = (x: number, y: number, r: number, alpha: number) => {
    g.fillStyle = `rgba(0,0,0,${alpha})`;
    for (const ox of [-TILE, 0, TILE]) for (const oy of [-TILE, 0, TILE]) {
      const px = x + ox, py = y + oy;
      if (px < -r || py < -r || px > TILE + r || py > TILE + r) continue;
      g.beginPath();
      g.arc(px, py, r, 0, Math.PI * 2);
      g.fill();
    }
  };
  for (let i = 0; i < 1400 + w * 7000; i++) dot(rand() * TILE, rand() * TILE, 0.45 + rand() ** 4 * 2.4, 0.65 + rand() * 0.35);
  for (let i = 0; i < 4 + w * 16; i++) dot(rand() * TILE, rand() * TILE, 1.6 + rand() * 3.2, 0.7 + rand() * 0.3);
  g.strokeStyle = "rgba(0,0,0,0.85)";
  g.lineCap = "round";
  for (let i = 0; i < 14 + w * 90; i++) {
    const x = rand() * TILE, y = rand() * TILE, a = rand() * Math.PI, len = 8 + rand() * 38;
    g.lineWidth = 0.4 + rand() * 0.9;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
    g.stroke();
  }
  tiles.set(cacheKey, canvas);
  return canvas;
}

/** Paints the text (in object-centered local units) with the given fill/outline; null means none. */
export type EffectPaint = (g: CanvasRenderingContext2D, fill: string | null, stroke: string | null, strokeWidth: number) => void;

export type EffectRenderInput = {
  /** null draws the plain text (used when only a warp is set). */
  effect: TextEffect | null;
  warp?: TextWarp | null;
  /** Text box size in local units. */
  width: number;
  height: number;
  /** Device pixels per local unit. */
  k: number;
  /** Local units that scale with font size (font size / 40). */
  unit: number;
  fill: string;
  stroke: string | null;
  strokeWidth: number;
  paint: EffectPaint;
};

const MAX_SIDE = 8192;

/** Room the effect needs around the text box, in local units. */
export function warpExtraPad(warp: TextWarp | null | undefined, height: number): number {
  return warp ? Math.ceil(height * (warp.kind === "slope" ? 0.7 : 0.55) * (Math.abs(warp.amount) / 100) + 4) : 0;
}

export function effectPadding(effect: TextEffect | null, unit: number, strokeWidth = 0): number {
  if (!effect) return Math.ceil(strokeWidth + 4);
  const a = clamp(effect.amount ?? 50, 0, 100) / 100;
  const u = unit;
  const need: Record<TextEffectKind, number> = {
    extrude: (3 + a * 26) * u + 4 * u,
    longshadow: (14 + a * 70) * u + 4 * u,
    pop: (2 + a * 10) * u + 4 * u,
    echo: 3 * (3 + a * 9) * u + 4 * u,
    emboss: 5 * u,
    neon: (30 + a * 36) * u,
    glow: (24 + a * 32) * u,
    foil: 4 * u,
    tide: 2 * u,
    worn: 2 * u,
    halftone: 2 * u,
    diecut: (3 + a * 10) * u + 16 * u,
    line: 4 * u,
    glitch: (1 + a * 5) * u * 2 + 4 * u,
  };
  return Math.ceil(need[effect.kind] + strokeWidth + 2);
}

/** Draws the effect and returns the bitmap; its center is the text box center. */
export function renderTextEffect(input: EffectRenderInput): { canvas: HTMLCanvasElement; scale: number } {
  const { effect, warp, width, height, unit: u, fill, stroke, strokeWidth: sw, paint } = input;
  const pad = effectPadding(effect, u, sw);
  const padY = pad + warpExtraPad(warp, height);
  const fullW = width + pad * 2, fullH = height + padY * 2;
  const k = Math.min(input.k, MAX_SIDE / fullW, MAX_SIDE / fullH);
  const cw = Math.max(2, Math.ceil(fullW * k)), ch = Math.max(2, Math.ceil(fullH * k));
  const amount = clamp(effect?.amount ?? 50, 0, 100) / 100;

  const make = () => {
    const canvas = document.createElement("canvas");
    canvas.width = cw;
    canvas.height = ch;
    const g = canvas.getContext("2d")!;
    g.setTransform(k, 0, 0, k, cw / 2, ch / 2);
    return { canvas, g };
  };
  const text = (f: string | null, s: string | null, w: number) => {
    const layer = make();
    paint(layer.g, f, s, w);
    return layer.canvas;
  };
  const out = make();
  const blit = (src: HTMLCanvasElement, dx = 0, dy = 0, alpha = 1, op: GlobalCompositeOperation = "source-over", target = out.g) => {
    target.save();
    target.setTransform(1, 0, 0, 1, 0, 0);
    target.globalAlpha = alpha;
    target.globalCompositeOperation = op;
    target.drawImage(src, Math.round(dx * k), Math.round(dy * k));
    target.restore();
  };
  const body = () => blit(text(fill, stroke, sw));
  const bounds = { x0: cw / 2 - (width / 2) * k, x1: cw / 2 + (width / 2) * k, y0: ch / 2 - (height / 2) * k, y1: ch / 2 + (height / 2) * k };

  if (!effect) body();
  else switch (effect.kind) {
    case "extrude": {
      const color = effect.color ?? darken(fill, 0.55);
      const depth = (3 + amount * 26) * u;
      const step = Math.max(1 / k, depth / 60);
      const side = text(color, color, Math.max(sw, step * 1.3));
      for (let i = depth; i >= step; i -= step) blit(side, i, i);
      body();
      break;
    }
    case "longshadow": {
      const color = effect.color ?? darken(fill, 0.5);
      const depth = (14 + amount * 70) * u;
      const step = Math.max(1 / k, depth / 90);
      const side = text(color, color, Math.max(sw, step * 1.3));
      const trail = make();
      for (let i = depth; i >= step; i -= step) blit(side, i, i, 1, "source-over", trail.g);
      trail.g.setTransform(1, 0, 0, 1, 0, 0);
      trail.g.globalCompositeOperation = "destination-in";
      const fade = trail.g.createLinearGradient(bounds.x0, bounds.y0, bounds.x1 + depth * k, bounds.y1 + depth * k);
      fade.addColorStop(0, "rgba(0,0,0,1)");
      fade.addColorStop(1, "rgba(0,0,0,0)");
      trail.g.fillStyle = fade;
      trail.g.fillRect(0, 0, cw, ch);
      blit(trail.canvas);
      body();
      break;
    }
    case "pop": {
      const color = effect.color ?? darken(fill, 0.6);
      const d = (2 + amount * 10) * u;
      blit(text(color, color, sw + 1.4 * u), d, d);
      body();
      break;
    }
    case "echo": {
      const color = effect.color ?? fill;
      const d = (3 + amount * 9) * u;
      const ring = text(null, color, Math.max(sw, 1.7 * u));
      for (let i = 3; i >= 1; i--) blit(ring, i * d, i * d, 1 - (i - 1) * 0.28);
      body();
      break;
    }
    case "emboss": {
      const light = effect.color ?? "#ffffff";
      const dark = effect.accent ?? "#10241f";
      const d = (0.8 + amount * 1.6) * u;
      blit(text(dark, dark, sw), d, d, 0.7);
      blit(text(light, light, sw), -d, -d, 0.85);
      body();
      break;
    }
    case "glow":
    case "neon": {
      const color = effect.color ?? "#ff3d8b";
      const strength = 0.55 + amount * 1.0;
      const tube = effect.kind === "neon" ? text(color, color, 3 * u + sw) : text(color, color, sw);
      const layers: Array<[number, number]> = effect.kind === "neon" ? [[34, 0.9], [16, 0.9], [6, 1]] : [[28, 0.8], [12, 0.6]];
      for (const [blur, alpha] of layers) {
        out.g.save();
        out.g.setTransform(1, 0, 0, 1, 0, 0);
        out.g.shadowColor = color;
        out.g.shadowBlur = blur * u * strength * k;
        out.g.globalAlpha = alpha;
        out.g.drawImage(tube, 0, 0);
        out.g.restore();
      }
      blit(text(fill, effect.kind === "neon" ? color : stroke, effect.kind === "neon" ? 2.4 * u + sw : sw));
      break;
    }
    case "foil": {
      const hi = effect.color ?? "#f7d774";
      const lo = effect.accent ?? "#8a5a0c";
      const shine = 0.25 + amount * 0.6;
      blit(text(lo, lo, 0), 0.9 * u, 0.9 * u, 0.55);
      if (stroke && sw) blit(text(null, stroke, sw));
      const metal = make();
      metal.g.setTransform(1, 0, 0, 1, 0, 0);
      metal.g.drawImage(text("#000000", null, 0), 0, 0);
      metal.g.globalCompositeOperation = "source-in";
      const band = metal.g.createLinearGradient(0, bounds.y0, 0, bounds.y1);
      band.addColorStop(0, lighten(hi, shine));
      band.addColorStop(0.3, hi);
      band.addColorStop(0.5, lo);
      band.addColorStop(0.53, lighten(hi, shine * 0.5));
      band.addColorStop(0.8, hi);
      band.addColorStop(1, mix(lo, hi, 0.25));
      metal.g.fillStyle = band;
      metal.g.fillRect(0, 0, cw, ch);
      blit(text(null, "#ffffff", 1.6 * u), -0.4 * u, -0.4 * u, 0.4 + shine * 0.5, "source-atop", metal.g);
      blit(text(null, lo, 1.8 * u), 0.5 * u, 0.5 * u, 0.5, "source-atop", metal.g);
      blit(metal.canvas);
      break;
    }
    case "tide": {
      const from = effect.color ?? "#ffbf3f";
      const to = effect.accent ?? "#e8325a";
      const angle = ((effect.amount ?? 25) / 100) * Math.PI * 2;
      const dx = Math.cos(angle), dy = Math.sin(angle);
      const half = (Math.abs(dx) * (width / 2) + Math.abs(dy) * (height / 2)) * k;
      const mid = { x: cw / 2, y: ch / 2 };
      const tint = make();
      tint.g.setTransform(1, 0, 0, 1, 0, 0);
      tint.g.drawImage(text("#000000", null, 0), 0, 0);
      tint.g.globalCompositeOperation = "source-in";
      const ramp = tint.g.createLinearGradient(mid.x - dx * half, mid.y - dy * half, mid.x + dx * half, mid.y + dy * half);
      ramp.addColorStop(0, from);
      ramp.addColorStop(1, to);
      tint.g.fillStyle = ramp;
      tint.g.fillRect(0, 0, cw, ch);
      if (stroke && sw) blit(text(null, stroke, sw));
      blit(tint.canvas);
      break;
    }
    case "worn": {
      body();
      const scale = Math.max(0.35, k * u * 0.9);
      const res = Math.min(4, Math.max(1, Math.ceil(scale)));
      const tile = wearTile(effect.amount ?? 50, res);
      const pattern = out.g.createPattern(tile, "repeat");
      if (pattern) {
        pattern.setTransform(new DOMMatrix().scale(scale / res, scale / res));
        out.g.save();
        out.g.setTransform(1, 0, 0, 1, 0, 0);
        out.g.globalCompositeOperation = "destination-out";
        out.g.fillStyle = pattern;
        out.g.fillRect(0, 0, cw, ch);
        out.g.restore();
      }
      break;
    }
    case "halftone": {
      body();
      const spacing = (3.2 + (1 - amount) * 3.2) * u;
      const rowStep = spacing * 0.866;
      const reach = 0.5 + amount * 0.5;
      out.g.save();
      out.g.globalCompositeOperation = "destination-out";
      out.g.fillStyle = "#000";
      out.g.beginPath();
      let row = 0;
      for (let y = -height / 2; y <= height / 2; y += rowStep, row++) {
        const t = clamp((y + height / 2) / Math.max(1, height), 0, 1);
        const r = spacing * 0.64 * clamp((t - 0.2) / 0.8, 0, 1) * reach * 1.25;
        if (r < 0.05) continue;
        for (let x = -width / 2 - spacing + (row % 2 ? spacing / 2 : 0); x <= width / 2 + spacing; x += spacing) {
          out.g.moveTo(x + r, y);
          out.g.arc(x, y, r, 0, Math.PI * 2);
        }
      }
      out.g.fill();
      out.g.restore();
      break;
    }
    case "diecut": {
      const border = (3 + amount * 10) * u;
      const color = effect.color ?? "#ffffff";
      const keyline = effect.accent;
      const rim = text(keyline ?? color, keyline ?? color, border * 2 + (keyline ? 2.6 * u : 0));
      out.g.save();
      out.g.setTransform(1, 0, 0, 1, 0, 0);
      out.g.shadowColor = "rgba(0,0,0,0.38)";
      out.g.shadowBlur = 6 * u * k;
      out.g.shadowOffsetY = 3 * u * k;
      out.g.drawImage(rim, 0, 0);
      out.g.restore();
      if (keyline) blit(text(color, color, border * 2));
      body();
      break;
    }
    case "line": {
      const color = effect.color ?? fill;
      blit(text(null, color, (1 + amount * 3) * u));
      break;
    }
    case "glitch": {
      const a = effect.color ?? "#ff2e63";
      const b = effect.accent ?? "#08d9d6";
      const d = (1 + amount * 5) * u;
      blit(text(a, null, 0), -d, 0, 0.95, "lighter");
      blit(text(b, null, 0), d, 0, 0.95, "lighter");
      const main = text(fill, stroke, sw);
      blit(main);
      const rand = seeded(7 + Math.round(amount * 40));
      for (let i = 0; i < 3; i++) {
        const y = bounds.y0 + rand() * (bounds.y1 - bounds.y0) * 0.85;
        const h = Math.max(2, (0.08 + rand() * 0.12) * (bounds.y1 - bounds.y0));
        const shift = (rand() > 0.5 ? 1 : -1) * (3 + rand() * 8) * u * k;
        out.g.save();
        out.g.setTransform(1, 0, 0, 1, 0, 0);
        out.g.beginPath();
        out.g.rect(0, y, cw, h);
        out.g.clip();
        out.g.clearRect(0, 0, cw, ch);
        out.g.drawImage(main, shift, 0);
        out.g.restore();
      }
      break;
    }
  }
  const result = warp && warp.amount ? warpCanvas(out.canvas, warp, { cw, ch, k, bounds, height }) : out.canvas;
  return { canvas: result, scale: k };
}

/** Column-by-column vertical shift and stretch of a finished bitmap. */
function warpCanvas(src: HTMLCanvasElement, warp: TextWarp, m: { cw: number; ch: number; k: number; bounds: { x0: number; x1: number }; height: number }): HTMLCanvasElement {
  const dst = document.createElement("canvas");
  dst.width = m.cw;
  dst.height = m.ch;
  const g = dst.getContext("2d")!;
  const a = clamp(warp.amount, -100, 100) / 100;
  const strip = m.cw > 3000 ? 2 : 1;
  const span = Math.max(1, m.bounds.x1 - m.bounds.x0);
  const tall = m.height * m.k;
  const cy = m.ch / 2;
  for (let x = 0; x < m.cw; x += strip) {
    const u = (x + strip / 2 - m.bounds.x0) / span;
    const t = clamp(u, 0, 1);
    let s = 1, dy = 0;
    switch (warp.kind) {
      case "wave": dy = Math.sin(u * Math.PI * 2 * 1.25) * a * tall * 0.35; break;
      case "ripple": dy = Math.sin(u * Math.PI * 2 * 3.5) * a * tall * 0.14; break;
      case "flag": dy = Math.sin(u * Math.PI * 2 * 1.4) * a * tall * 0.3 * (0.35 + 0.65 * t); s = 1 + Math.cos(u * Math.PI * 2 * 1.4) * a * 0.1 * t; break;
      case "bulge": s = 1 + a * 0.9 * (1 - (2 * t - 1) ** 2); break;
      case "rise": s = 1 + a * 0.8 * (2 * t - 1); break;
      case "slope": dy = (t - 0.5) * a * tall; break;
    }
    s = Math.max(0.12, s);
    g.drawImage(src, x, 0, strip, m.ch, x, cy * (1 - s) + dy, strip, m.ch * s);
  }
  return dst;
}

export function describeTextEffect(effect: TextEffect | null | undefined): string {
  return effect ? TEXT_EFFECT_NAMES[effect.kind] : "None";
}
