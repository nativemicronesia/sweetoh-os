import sharp from "sharp";

/**
 * Free, local background removal for images on a plain backdrop: logos,
 * screenshots, artwork on white, products shot on a sheet or wall. Busy
 * photos return `ok: false` so callers can fall back to the AI cutout.
 */
export type Cutout = {
  png: Buffer;
  ok: boolean;
  /** Foreground bounding box as fractions of the returned image. */
  box: { x: number; y: number; width: number; height: number } | null;
};

const MAX_SIDE = 2000;

function dist(d: Uint8Array, p: number, c: [number, number, number]) {
  return Math.abs(d[p] - c[0]) + Math.abs(d[p + 1] - c[1]) + Math.abs(d[p + 2] - c[2]);
}

export async function removeUniformBackground(
  input: Buffer,
  opts: { dropIslands?: boolean } = {},
): Promise<Cutout> {
  const { data, info } = await sharp(input, { limitInputPixels: 40_000_000 })
    .rotate()
    .resize(MAX_SIDE, MAX_SIDE, { fit: "inside", withoutEnlargement: true })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const w = info.width, h = info.height;
  const d = new Uint8Array(data.buffer, data.byteOffset, data.length);

  // Backdrop colour = median of the border; it must dominate the border.
  const border: number[] = [];
  for (let x = 0; x < w; x += 2) border.push(x, (h - 1) * w + x);
  for (let y = 0; y < h; y += 2) border.push(y * w, y * w + w - 1);
  const channel = (c: number) => border.map((i) => d[i * 4 + c]).sort((a, b) => a - b)[border.length >> 1];
  const bg: [number, number, number] = [channel(0), channel(1), channel(2)];
  const alreadyClear = border.filter((i) => d[i * 4 + 3] < 16).length / border.length > 0.9;
  const plain = border.filter((i) => d[i * 4 + 3] < 16 || dist(d, i * 4, bg) < 45).length / border.length;
  if (!alreadyClear && plain < 0.82) return { png: input, ok: false, box: null };

  // Flood the backdrop in from the edges; stop at the subject's outline.
  const TOL = 42;
  const gone = new Uint8Array(w * h);
  const stack = new Int32Array(w * h);
  let top = 0;
  const bgLum = bg[0] + bg[1] + bg[2];
  // A cast shadow is the backdrop's own colour, only darker: equal channel ratios.
  const isShadow = (p: number) => {
    const lum = d[p] + d[p + 1] + d[p + 2];
    if (lum > bgLum || lum < bgLum * 0.45) return false;
    const r = d[p] / (bg[0] || 1), g = d[p + 1] / (bg[1] || 1), b = d[p + 2] / (bg[2] || 1);
    return Math.max(r, g, b) - Math.min(r, g, b) < 0.05;
  };
  const isBg = (i: number) => d[i * 4 + 3] < 16 || dist(d, i * 4, bg) < TOL || isShadow(i * 4);
  const push = (i: number) => {
    if (!gone[i] && isBg(i)) {
      gone[i] = 1;
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

  // Products: drop stray islands (loose shadows, dust). Artwork keeps every
  // piece: letters and small marks are the design.
  if (opts.dropIslands) {
  const label = new Int32Array(w * h);
  const sizes: number[] = [0];
  for (let s = 0; s < w * h; s++) {
    if (gone[s] || label[s]) continue;
    const id = sizes.length;
    let n = 0;
    label[s] = id;
    stack[top++] = s;
    while (top) {
      const i = stack[--top];
      n++;
      const x = i % w;
      for (const j of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, i - w, i + w]) {
        if (j < 0 || j >= w * h || gone[j] || label[j]) continue;
        label[j] = id;
        stack[top++] = j;
      }
    }
    sizes.push(n);
  }
  const largest = Math.max(...sizes);
  for (let i = 0; i < w * h; i++) if (!gone[i] && sizes[label[i]] < largest * 0.03) gone[i] = 1;
  }

  let removed = 0, x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let i = 0; i < w * h; i++) {
    const p = i * 4;
    if (gone[i]) {
      d[p + 3] = 0;
      removed++;
      continue;
    }
    // Soften the 1px rim that still carries backdrop colour.
    const x = i % w;
    const rim = (x > 0 && gone[i - 1]) || (x < w - 1 && gone[i + 1]) || (i >= w && gone[i - w]) || (i < w * (h - 1) && gone[i + w]);
    if (rim) d[p + 3] = Math.min(d[p + 3], Math.round(255 * Math.min(1, dist(d, p, bg) / (TOL * 2.2))));
    const y = (i / w) | 0;
    if (x < x0) x0 = x;
    if (x > x1) x1 = x;
    if (y < y0) y0 = y;
    if (y > y1) y1 = y;
  }
  const share = removed / (w * h);
  if (share < 0.04 || share > 0.97 || x1 < 0) return { png: input, ok: false, box: null };

  // Crop to the subject with a little breathing room.
  const pad = Math.round(Math.max(x1 - x0, y1 - y0) * 0.04);
  const left = Math.max(0, x0 - pad), topY = Math.max(0, y0 - pad);
  const width = Math.min(w, x1 + pad + 1) - left, height = Math.min(h, y1 + pad + 1) - topY;
  const png = await sharp(Buffer.from(d.buffer, d.byteOffset, d.length), { raw: { width: w, height: h, channels: 4 } })
    .extract({ left, top: topY, width, height })
    .png()
    .toBuffer();
  return { png, ok: true, box: { x: (x0 - left) / width, y: (y0 - topY) / height, width: (x1 - x0) / width, height: (y1 - y0) / height } };
}

/** Bounding box of opaque pixels in a transparent PNG, as fractions. */
export async function opaqueBox(png: Buffer) {
  const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = info.width, h = info.height;
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let i = 0; i < w * h; i++) {
    if (data[i * 4 + 3] < 24) continue;
    const x = i % w, y = (i / w) | 0;
    if (x < x0) x0 = x;
    if (x > x1) x1 = x;
    if (y < y0) y0 = y;
    if (y > y1) y1 = y;
  }
  if (x1 < 0) return null;
  return { x: x0 / w, y: y0 / h, width: (x1 - x0) / w, height: (y1 - y0) / h };
}

/** Square, centered canvas so every view lines up in the 720px editor. */
export async function squareOnTransparent(png: Buffer, side = 1600) {
  return sharp(png)
    .resize(Math.round(side * 0.92), Math.round(side * 0.92), { fit: "inside", withoutEnlargement: false })
    .extend({ top: 0, bottom: 0, left: 0, right: 0, background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer()
    .then((inner) =>
      sharp({ create: { width: side, height: side, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
        .composite([{ input: inner, gravity: "center" }])
        .png()
        .toBuffer(),
    );
}

/** Share of visible pixels that look like skin — a person is in the "cutout". */
export async function skinShare(png: Buffer) {
  const { data } = await sharp(png).ensureAlpha().resize(400, 400, { fit: "inside" }).raw().toBuffer({ resolveWithObject: true });
  let visible = 0, skin = 0;
  for (let p = 0; p < data.length; p += 4) {
    if (data[p + 3] < 128) continue;
    visible++;
    const r = data[p], g = data[p + 1], b = data[p + 2];
    if (r > 95 && g > 40 && b > 20 && r > g && r > b && r - g > 15 && Math.max(r, g, b) - Math.min(r, g, b) > 15) skin++;
  }
  return visible ? skin / visible : 0;
}
