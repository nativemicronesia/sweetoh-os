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
export type TintResult = { url: string; coverage: number };

const MAX_SIDE = 1200;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Image failed to load"));
    img.src = src;
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
  const found = garmentMask(
    image.data,
    w,
    h,
    Math.round(seed.x * w),
    Math.round(seed.y * h),
  );
  if (!found) return null;
  const [tr, tg, tb] = hexRgb(hex);
  const d = image.data;
  for (let i = 0, p = 0; i < w * h; i++, p += 4) {
    if (!found.mask[i]) continue;
    const l = 0.299 * d[p] + 0.587 * d[p + 1] + 0.114 * d[p + 2];
    // Shade relative to the fabric's base brightness; lift darks slightly so
    // black garments still show folds.
    const k = Math.min(1.15, l / found.refLum);
    const lift = (1 - k) * 18;
    d[p] = Math.max(0, Math.min(255, tr * k + (tr < 40 ? lift : 0)));
    d[p + 1] = Math.max(0, Math.min(255, tg * k + (tg < 40 ? lift : 0)));
    d[p + 2] = Math.max(0, Math.min(255, tb * k + (tb < 40 ? lift : 0)));
  }
  ctx.putImageData(image, 0, 0);
  return { url: canvas.toDataURL("image/jpeg", 0.9), coverage: found.count / (w * h) };
}
