import { Pattern, Rect } from "fabric";

/**
 * Repeating fill for a print area from one motif. The tile is drawn at a
 * higher resolution than the canvas and scaled down, so exported print files
 * stay sharp.
 */
function load(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Pattern image failed to load"));
    img.src = src;
  });
}

export async function patternTile(src: string, tilePx: number, gap: number, brick: boolean) {
  const img = await load(src);
  const sf = Math.max(1, Math.min(8, 1600 / tilePx));
  const t = Math.max(8, Math.round(tilePx * sf));
  const inner = t * (1 - gap);
  const r = Math.min(inner / img.naturalWidth, inner / img.naturalHeight);
  const w = img.naturalWidth * r, h = img.naturalHeight * r;
  const canvas = document.createElement("canvas");
  canvas.width = t;
  canvas.height = brick ? t * 2 : t;
  const ctx = canvas.getContext("2d")!;
  const draw = (cx: number, cy: number) => ctx.drawImage(img, cx - w / 2, cy - h / 2, w, h);
  draw(t / 2, t / 2);
  if (brick) {
    // Second row shifted half a tile, wrapping across the tile edge.
    draw(0, t * 1.5);
    draw(t, t * 1.5);
  }
  return { canvas, sf };
}

export async function makePatternRect(
  src: string,
  opts: { width: number; height: number; tile: number; gap: number; brick: boolean },
) {
  const tilePx = opts.width * opts.tile;
  const { canvas, sf } = await patternTile(src, tilePx, opts.gap, opts.brick);
  return new Rect({
    width: opts.width,
    height: opts.height,
    fill: new Pattern({ source: canvas, repeat: "repeat", patternTransform: [1 / sf, 0, 0, 1 / sf, 0, 0] }),
  });
}
