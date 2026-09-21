/**
 * Recolors a blank garment photo so one catalog photo can stand in for every
 * color. Starting from the print area (always on the garment), it grows a
 * region over neutral, low-contrast pixels — the white/grey fabric and its
 * fold shadows — and stops at edges, skin, and colored backdrops. Pixels in
 * the region are recolored by their brightness, so folds keep their shading.
 *
 * Returns null when the region is implausible (too small, or it leaked into
 * the backdrop); callers should then show the original photo.
 */
import { sizedPhoto } from "./photo";

export type TintResult = { url: string; coverage: number };

const MAX_SIDE = 1200;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Image failed to load"));
    img.src = sizedPhoto(src);
  });
}

function hexRgb(hex: string): [number, number, number] {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];
}

export function garmentMask(
  data: Uint8ClampedArray,
  w: number,
  h: number,
  seedX: number,
  seedY: number,
): { mask: Uint8Array; count: number; refLum: number } | null {
  const lum = new Float32Array(w * h);
  const chroma = new Float32Array(w * h);
  for (let i = 0, p = 0; i < w * h; i++, p += 4) {
    const r = data[p], g = data[p + 1], b = data[p + 2];
    lum[i] = 0.299 * r + 0.587 * g + 0.114 * b;
    chroma[i] = Math.max(r, g, b) - Math.min(r, g, b);
  }
  // Seed on the most garment-like pixel near the print-area center.
  let seed = -1;
  let best = -Infinity;
  const r0 = Math.round(Math.min(w, h) * 0.04);
  for (let dy = -r0; dy <= r0; dy += 2)
    for (let dx = -r0; dx <= r0; dx += 2) {
      const x = seedX + dx, y = seedY + dy;
      if (x < 1 || y < 1 || x >= w - 1 || y >= h - 1) continue;
      const i = y * w + x;
      const score = lum[i] - chroma[i] * 4;
      if (score > best) { best = score; seed = i; }
    }
  if (seed < 0 || chroma[seed] > 26 || lum[seed] < 60) return null;
  const refLum = lum[seed];
  const maxChroma = Math.max(7, chroma[seed] + 5);
  // Edge strength from a 3x3 Sobel on luminance; fabric folds are soft,
  // garment outlines against a backdrop are not.
  const edge = new Float32Array(w * h);
  for (let y = 1; y < h - 1; y++)
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const gx =
        lum[i - w + 1] + 2 * lum[i + 1] + lum[i + w + 1] -
        lum[i - w - 1] - 2 * lum[i - 1] - lum[i + w - 1];
      const gy =
        lum[i + w - 1] + 2 * lum[i + w] + lum[i + w + 1] -
        lum[i - w - 1] - 2 * lum[i - w] - lum[i - w + 1];
      edge[i] = Math.hypot(gx, gy);
    }

  const mask = new Uint8Array(w * h);
  const stack = new Int32Array(w * h);
  let top = 0;
  let count = 0;
  stack[top++] = seed;
  mask[seed] = 1;
  while (top) {
    const i = stack[--top];
    count++;
    const x = i % w, y = (i / w) | 0;
    for (const j of [i - 1, i + 1, i - w, i + w]) {
      if (mask[j]) continue;
      const jx = j % w, jy = (j / w) | 0;
      if (jx < 1 || jy < 1 || jx >= w - 1 || jy >= h - 1) continue;
      if (Math.abs(jx - x) + Math.abs(jy - y) !== 1) continue;
      if (chroma[j] > maxChroma) continue; // skin, backdrop tint, prints
      if (Math.abs(lum[j] - lum[i]) > 9 || edge[j] > 60) continue; // an edge
      if (lum[j] < refLum * 0.45) continue; // deep shadow / outline
      mask[j] = 1;
      stack[top++] = j;
    }
  }
  const coverage = count / (w * h);
  if (coverage < 0.03 || coverage > 0.72) return null;
  // Grow into seams, crease lines and pinholes the edge test stopped at,
  // but only over neutral fabric-bright pixels so skin and backdrop stay put.
  let out = mask;
  for (let pass = 0; pass < 3; pass++) {
    const next = out.slice();
    for (let y = 1; y < h - 1; y++)
      for (let x = 1; x < w - 1; x++) {
        const i = y * w + x;
        if (out[i] || chroma[i] > maxChroma + 6 || lum[i] < refLum * 0.5) continue;
        if (out[i - 1] || out[i + 1] || out[i - w] || out[i + w]) {
          next[i] = 1;
          count++;
        }
      }
    out = next;
  }
  return { mask: out, count, refLum };
}

/** Marks every non-garment region that doesn't touch the image border as garment. */
function fillHoles(mask: Uint8Array, w: number, h: number, keep: (i: number) => boolean = () => false) {
  const outside = new Uint8Array(w * h);
  const stack = new Int32Array(w * h);
  let top = 0;
  const push = (i: number) => {
    if (!mask[i] && !outside[i]) {
      outside[i] = 1;
      stack[top++] = i;
    }
  };
  for (let x = 0; x < w; x++) { push(x); push((h - 1) * w + x); }
  for (let y = 0; y < h; y++) { push(y * w); push(y * w + w - 1); }
  while (top) {
    const i = stack[--top];
    const x = i % w;
    if (x > 0) push(i - 1);
    if (x < w - 1) push(i + 1);
    if (i >= w) push(i - w);
    if (i < w * (h - 1)) push(i + w);
  }
  for (let i = 0; i < w * h; i++) if (!mask[i] && !outside[i] && !keep(i)) mask[i] = 2;
  // Swallow the soft, anti-aliased edge around each filled graphic.
  for (let pass = 0; pass < 3; pass++) {
    const grow: number[] = [];
    for (let i = w; i < w * (h - 1); i++)
      if (mask[i] === 1 && (mask[i - 1] === 2 || mask[i + 1] === 2 || mask[i - w] === 2 || mask[i + w] === 2)) grow.push(i);
    for (const i of grow) mask[i] = 2;
  }
}

/** Colored print guides touching the garment edge (e.g. sleeve brackets) become fabric. */
function absorbEdgeMarks(d: Uint8ClampedArray, mask: Uint8Array, w: number, h: number) {
  const chroma = (i: number) => {
    const p = i * 4;
    return Math.max(d[p], d[p + 1], d[p + 2]) - Math.min(d[p], d[p + 1], d[p + 2]);
  };
  for (let pass = 0; pass < 8; pass++) {
    const grow: number[] = [];
    for (let i = w; i < w * (h - 1); i++)
      if (!mask[i] && chroma(i) > 28 && (mask[i - 1] || mask[i + 1] || mask[i - w] || mask[i + w])) grow.push(i);
    if (!grow.length) break;
    for (const i of grow) mask[i] = 2;
  }
}

const BACKDROP: [number, number, number] = [244, 245, 247];
/** Flat shots: swap the studio backdrop for a clean light grey, softening the edge. */
function cleanBackdrop(d: Uint8ClampedArray, mask: Uint8Array, w: number, h: number) {
  const edge: number[] = [];
  for (let i = 0; i < w * h; i++) {
    if (mask[i]) continue;
    const x = i % w;
    const near = (x > 0 && mask[i - 1]) || (x < w - 1 && mask[i + 1]) || (i >= w && mask[i - w]) || (i < w * (h - 1) && mask[i + w]);
    if (near) edge.push(i);
    else {
      const p = i * 4;
      d[p] = BACKDROP[0];
      d[p + 1] = BACKDROP[1];
      d[p + 2] = BACKDROP[2];
    }
  }
  for (const i of edge) {
    const p = i * 4;
    d[p] = (d[p] + BACKDROP[0]) / 2;
    d[p + 1] = (d[p + 1] + BACKDROP[1]) / 2;
    d[p + 2] = (d[p + 2] + BACKDROP[2]) / 2;
  }
}

/** Recolour an already cut-out product by shading, then sit it on the studio backdrop. */
function tintCutout(d: Uint8ClampedArray, hex: string) {
  const lums: number[] = [];
  for (let p = 0; p < d.length; p += 16) if (d[p + 3] > 200) lums.push(0.299 * d[p] + 0.587 * d[p + 1] + 0.114 * d[p + 2]);
  lums.sort((a, b) => a - b);
  const ref = lums[Math.floor(lums.length * 0.9)] || 255;
  const white = /^#f[a-f0-9]f[a-f0-9]f[a-f0-9]$/i.test(hex);
  const [tr, tg, tb] = hexRgb(hex);
  for (let p = 0; p < d.length; p += 4) {
    const a = d[p + 3] / 255;
    if (a > 0 && !white) {
      const l = 0.299 * d[p] + 0.587 * d[p + 1] + 0.114 * d[p + 2];
      const k = Math.min(1.15, l / ref);
      const lift = (1 - k) * 18;
      d[p] = Math.min(255, tr * k + (tr < 40 ? lift : 0));
      d[p + 1] = Math.min(255, tg * k + (tg < 40 ? lift : 0));
      d[p + 2] = Math.min(255, tb * k + (tb < 40 ? lift : 0));
    }
    d[p] = d[p] * a + BACKDROP[0] * (1 - a);
    d[p + 1] = d[p + 1] * a + BACKDROP[1] * (1 - a);
    d[p + 2] = d[p + 2] * a + BACKDROP[2] * (1 - a);
    d[p + 3] = 255;
  }
}

export async function tintGarment(
  src: string,
  hex: string,
  seed: { x: number; y: number },
): Promise<TintResult | null> {
  const img = await loadImage(src);
  const scale = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.round(img.naturalWidth * scale);
  const h = Math.round(img.naturalHeight * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0, w, h);
  const image = ctx.getImageData(0, 0, w, h);
  // Cutouts (the partner's own products) already know their outline: use it.
  let clear = 0;
  for (let p = 3; p < image.data.length; p += 16) if (image.data[p] < 16) clear++;
  if (clear / ((w * h) / 4) > 0.05) {
    tintCutout(image.data, hex);
    ctx.putImageData(image, 0, 0);
    return { url: canvas.toDataURL("image/jpeg", 0.9), coverage: 1 - clear / ((w * h) / 4) };
  }
  const found = garmentMask(
    image.data,
    w,
    h,
    Math.round(seed.x * w),
    Math.round(seed.y * h),
  );
  if (!found) return null;
  const d = image.data;
  let skin = 0;
  for (let p = 0; p < d.length; p += 16) if (isSkin(d[p], d[p + 1], d[p + 2])) skin++;
  // Flat product shots only (no person): paint over printed placeholders and
  // tags enclosed by the fabric so the blank reads clean.
  const flat = skin / (w * h / 4) < 0.004;
  // Printed placeholders enclosed by fabric are painted over on every photo;
  // skin (a hand in a pocket) is left alone.
  fillHoles(found.mask, w, h, (i) => isSkin(d[i * 4], d[i * 4 + 1], d[i * 4 + 2]));
  if (flat) absorbEdgeMarks(d, found.mask, w, h);
  const [tr, tg, tb] = hexRgb(hex);
  for (let i = 0, p = 0; i < w * h; i++, p += 4) {
    if (!found.mask[i]) continue;
    const l = found.mask[i] === 2 ? found.refLum * 0.97 : 0.299 * d[p] + 0.587 * d[p + 1] + 0.114 * d[p + 2];
    // Shade relative to the fabric's base brightness; lift darks slightly so
    // black garments still show folds.
    const k = Math.min(1.15, l / found.refLum);
    const lift = (1 - k) * 18;
    d[p] = Math.max(0, Math.min(255, tr * k + (tr < 40 ? lift : 0)));
    d[p + 1] = Math.max(0, Math.min(255, tg * k + (tg < 40 ? lift : 0)));
    d[p + 2] = Math.max(0, Math.min(255, tb * k + (tb < 40 ? lift : 0)));
  }
  if (flat) cleanBackdrop(d, found.mask, w, h);
  ctx.putImageData(image, 0, 0);
  return { url: canvas.toDataURL("image/jpeg", 0.9), coverage: found.count / (w * h) };
}

async function pixels(src: string, maxSide: number) {
  const img = await loadImage(src);
  const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.round(img.naturalWidth * scale);
  const h = Math.round(img.naturalHeight * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas unavailable");
  ctx.drawImage(img, 0, 0, w, h);
  return { data: ctx.getImageData(0, 0, w, h).data, w, h };
}

function isSkin(r: number, g: number, b: number) {
  return r > 95 && g > 40 && b > 20 && r > g && r > b && r - g > 15 && Math.max(r, g, b) - Math.min(r, g, b) > 15;
}

export type PhotoInfo = {
  /** Higher is better for designing on: a clean, flat, unprinted garment. */
  score: number;
  /** Garment bounding box as fractions of the image, when it was found. */
  box: { x: number; y: number; width: number; height: number } | null;
  skin?: number;
};

/** How well a catalog photo works as a design canvas (flat, no model, no print). */
export async function analyzePhoto(src: string): Promise<PhotoInfo> {
  const { data, w, h } = await pixels(src, 420);
  let skin = 0;
  for (let p = 0; p < data.length; p += 4) if (isSkin(data[p], data[p + 1], data[p + 2])) skin++;
  const found = garmentMask(data, w, h, Math.round(w * 0.5), Math.round(h * 0.45));
  if (!found) return { score: -1, box: null };
  let x0 = w, y0 = h, x1 = 0, y1 = 0;
  for (let i = 0; i < w * h; i++) {
    if (!found.mask[i]) continue;
    const x = i % w, y = (i / w) | 0;
    if (x < x0) x0 = x;
    if (x > x1) x1 = x;
    if (y < y0) y0 = y;
    if (y > y1) y1 = y;
  }
  // Pre-printed placeholder graphics show up as holes in the chest area.
  let holes = 0, total = 0;
  const cx0 = Math.round(x0 + (x1 - x0) * 0.3), cx1 = Math.round(x0 + (x1 - x0) * 0.7);
  const cy0 = Math.round(y0 + (y1 - y0) * 0.25), cy1 = Math.round(y0 + (y1 - y0) * 0.6);
  for (let y = cy0; y < cy1; y++)
    for (let x = cx0; x < cx1; x++) {
      total++;
      if (!found.mask[y * w + x]) holes++;
    }
  const skinRatio = skin / (w * h);
  const clutter = total ? holes / total : 1;
  const box = { x: x0 / w, y: y0 / h, width: (x1 - x0) / w, height: (y1 - y0) / h };
  const size = Math.min(1, box.width * box.height * 2.2);
  // Close-ups crop the garment at the image edges; a full product shot doesn't.
  const edges =
    Number(box.x < 0.02) + Number(box.y < 0.02) +
    Number(box.x + box.width > 0.98) + Number(box.y + box.height > 0.98);
  return {
    score: 1 - skinRatio * 10 - clutter * 1.5 + size * 0.3 - edges * 0.9,
    box,
    skin: skinRatio,
  };
}

/**
 * A chest print area inside the garment box, shaped like the product's real
 * print area (height / width). Fractions of the image.
 */
export function printAreaInBox(
  box: { x: number; y: number; width: number; height: number },
  ratio: number,
) {
  let width = box.width * 0.36;
  let height = width * ratio;
  if (height > box.height * 0.55) {
    height = box.height * 0.55;
    width = height / ratio;
  }
  const x = Math.min(Math.max(box.x + (box.width - width) / 2, 0), 1 - width);
  const y = Math.min(Math.max(box.y + box.height * 0.2, 0), 1 - height);
  return { x, y, width, height };
}
