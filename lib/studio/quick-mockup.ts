import { flatBlankSvg, flatBlankZone, type FlatBlankKind } from "./flat-blanks";

/**
 * Quick mockups: a design shown on a clean flat product at real print scale,
 * on a scene background. These are for listings, posts and quick decisions.
 * They are illustrations, not photographs, and never replace a sample or the
 * print provider's own product photos.
 */
export type MockupProduct = { kind: FlatBlankKind; name: string; widthIn: number; heightIn: number; fitDesignSize?: boolean };

export const MOCKUP_PRODUCTS: MockupProduct[] = [
  { kind: "tee", name: "T-shirt", widthIn: 12, heightIn: 16 },
  { kind: "hoodie", name: "Hoodie", widthIn: 12, heightIn: 14 },
  { kind: "tote", name: "Tote bag", widthIn: 11, heightIn: 11 },
  { kind: "panel", name: "Print", widthIn: 12, heightIn: 16, fitDesignSize: true },
];

export const MOCKUP_COLORS = [
  { name: "White", hex: "#ffffff" },
  { name: "Black", hex: "#141414" },
  { name: "Navy", hex: "#1c2c4a" },
  { name: "Forest", hex: "#244234" },
  { name: "Sand", hex: "#e6d9bd" },
  { name: "Coral", hex: "#e8795f" },
  { name: "Lagoon", hex: "#2aa6a0" },
] as const;

export const MOCKUP_SCENES = [
  { id: "lagoon", name: "Lagoon", stops: ["#dff3ee", "#a9dcd2"] },
  { id: "sand", name: "Sand", stops: ["#f6efe0", "#e6d8b8"] },
  { id: "sunset", name: "Sunset", stops: ["#ffe3c4", "#f5a98b"] },
  { id: "studio", name: "Studio", stops: ["#f3f4f6", "#d9dde2"] },
  { id: "clear", name: "Clear", stops: [] },
] as const;
export type MockupSceneId = (typeof MOCKUP_SCENES)[number]["id"];

export type Crop = { x: number; y: number; w: number; h: number };

/** The box around everything that is actually drawn (non-transparent), in the bitmap's own pixels. */
export function alphaBounds(source: CanvasImageSource & { width: number; height: number }): Crop | null {
  const scale = Math.min(1, 400 / Math.max(source.width, source.height));
  const w = Math.max(1, Math.round(source.width * scale)), h = Math.max(1, Math.round(source.height * scale));
  const { canvas, g } = canvasOf(1);
  canvas.width = w;
  canvas.height = h;
  g.drawImage(source, 0, 0, w, h);
  const { data } = g.getImageData(0, 0, w, h);
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (data[(y * w + x) * 4 + 3] > 12) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  if (x1 < 0) return null;
  const pad = 2;
  const left = Math.max(0, x0 - pad), top = Math.max(0, y0 - pad), right = Math.min(w, x1 + 1 + pad), bottom = Math.min(h, y1 + 1 + pad);
  return { x: left / scale, y: top / scale, w: (right - left) / scale, h: (bottom - top) / scale };
}

export type MockupInput = {
  design: CanvasImageSource;
  /** Show only this part of the design (used to fill the print area with the artwork itself). */
  crop?: Crop;
  /** Width / height of the artwork. */
  aspect: number;
  /** Printed size of the artwork in inches, when known (a design smaller than the print area stays smaller). */
  sizeIn?: { width: number; height: number };
  product: MockupProduct;
  color: string;
  scene: MockupSceneId;
  size?: number;
};

async function svgImage(svg: string): Promise<HTMLImageElement> {
  const image = new Image();
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  await image.decode();
  return image;
}

function canvasOf(size: number) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  return { canvas, g: canvas.getContext("2d")! };
}

/** Compose one mockup as a square canvas. */
export async function composeMockup(input: MockupInput): Promise<HTMLCanvasElement> {
  const size = input.size ?? 1600;
  const { product } = input;
  const widthIn = product.fitDesignSize && input.sizeIn ? input.sizeIn.width : product.widthIn;
  const heightIn = product.fitDesignSize && input.sizeIn ? input.sizeIn.height : product.heightIn;
  const zone = flatBlankZone(product.kind, widthIn, heightIn);
  const blank = await svgImage(flatBlankSvg(product.kind, { zone, widthIn, heightIn, color: input.color, position: "front" }));

  const out = canvasOf(size);
  const scene = MOCKUP_SCENES.find((s) => s.id === input.scene);
  if (scene && scene.stops.length) {
    const sky = out.g.createLinearGradient(0, 0, size * 0.4, size);
    sky.addColorStop(0, scene.stops[0]);
    sky.addColorStop(1, scene.stops[1]);
    out.g.fillStyle = sky;
    out.g.fillRect(0, 0, size, size);
    const glow = out.g.createRadialGradient(size * 0.5, size * 0.45, size * 0.1, size * 0.5, size * 0.5, size * 0.75);
    glow.addColorStop(0, "rgba(255,255,255,0.35)");
    glow.addColorStop(1, "rgba(255,255,255,0)");
    out.g.fillStyle = glow;
    out.g.fillRect(0, 0, size, size);
  }

  // Garment and print on their own layer, so the print and the shading stay inside the product's edge.
  const layer = canvasOf(size);
  layer.g.drawImage(blank, 0, 0, size, size);
  layer.g.globalCompositeOperation = "source-atop";
  const box = { x: zone.x * size, y: zone.y * size, w: zone.width * size, h: zone.height * size };
  const aspect = input.crop ? input.crop.w / input.crop.h : input.aspect;
  const fit = Math.min(box.w / aspect, box.h);
  const w = fit * aspect, h = fit;
  const dark = parseInt(input.color.slice(1), 16);
  const luminance = 0.299 * ((dark >> 16) & 255) + 0.587 * ((dark >> 8) & 255) + 0.114 * (dark & 255);
  // Ink on light cloth takes on a little of the fabric; on dark cloth it sits on top.
  layer.g.globalAlpha = luminance > 170 ? 0.96 : 1;
  if (input.crop) layer.g.drawImage(input.design, input.crop.x, input.crop.y, input.crop.w, input.crop.h, box.x + (box.w - w) / 2, box.y, w, h);
  else layer.g.drawImage(input.design, box.x + (box.w - w) / 2, box.y, w, h);
  layer.g.globalAlpha = 1;
  const light = layer.g.createLinearGradient(0, 0, size, size);
  light.addColorStop(0, "rgba(255,255,255,0.12)");
  light.addColorStop(0.5, "rgba(255,255,255,0)");
  light.addColorStop(1, "rgba(0,0,0,0.12)");
  layer.g.fillStyle = light;
  layer.g.fillRect(0, 0, size, size);
  // A faint weave so flat color reads as cloth.
  layer.g.fillStyle = "rgba(0,0,0,0.035)";
  const step = Math.max(3, Math.round(size / 400));
  for (let y = 0; y < size; y += step) for (let x = (y / step) % 2 ? 0 : step / 2; x < size; x += step * 2) layer.g.fillRect(x, y, 1, 1);

  out.g.save();
  out.g.shadowColor = "rgba(20,40,40,0.28)";
  out.g.shadowBlur = size * 0.03;
  out.g.shadowOffsetY = size * 0.015;
  out.g.drawImage(layer.canvas, 0, 0);
  out.g.restore();
  return out.canvas;
}

/** All products at one color on one sheet, captioned. */
export async function composeSheet(input: Omit<MockupInput, "product" | "size">, products: MockupProduct[] = MOCKUP_PRODUCTS): Promise<HTMLCanvasElement> {
  const cell = 900;
  const cols = Math.min(2, products.length);
  const rows = Math.ceil(products.length / cols);
  const sheet = document.createElement("canvas");
  sheet.width = cell * cols;
  sheet.height = cell * rows;
  const g = sheet.getContext("2d")!;
  if (input.scene !== "clear") { g.fillStyle = "#ffffff"; g.fillRect(0, 0, sheet.width, sheet.height); }
  for (let i = 0; i < products.length; i++) {
    const tile = await composeMockup({ ...input, product: products[i], size: cell });
    const x = (i % cols) * cell, y = Math.floor(i / cols) * cell;
    g.drawImage(tile, x, y);
    g.font = "600 28px system-ui, sans-serif";
    g.fillStyle = "rgba(23,62,57,0.85)";
    g.fillText(products[i].name, x + 36, y + cell - 36);
  }
  return sheet;
}
