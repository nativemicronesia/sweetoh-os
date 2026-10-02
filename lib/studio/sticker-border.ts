/**
 * Die-cut sticker border: a solid outline that follows the shape of an image's
 * visible pixels, like the white edge on a printed sticker. Works best on a
 * cutout (a photo with its background removed). Pure canvas math, no Fabric.
 */
export type StickerBorder = { color: string; /** Percent of the image's longer side, 0 to 12. */ width: number };

export const STICKER_COLORS = ["#ffffff", "#fff4d6", "#101828", "#173e39", "#e8795f", "#f2b84b"] as const;
export const STICKER_DEFAULT: StickerBorder = { color: "#ffffff", width: 3.5 };

/** Border thickness in the image's own pixels. */
export function stickerBorderPx(sticker: StickerBorder, width: number, height: number): number {
  return Math.max(0.5, (Math.max(width, height) * Math.min(12, Math.max(0, sticker.width))) / 100);
}

export type StickerBorderInput = {
  source: CanvasImageSource;
  /** The part of the source that is shown (Fabric crop), in source pixels. */
  crop: { x: number; y: number; width: number; height: number };
  border: number;
  color: string;
  /** Device pixels per image pixel. */
  scale: number;
};

const MAX_SIDE = 4096;

/** The silhouette, grown by `border`, in `color`. Its center is the image center. */
export function renderStickerBorder(input: StickerBorderInput): { canvas: HTMLCanvasElement; scale: number; pad: number } {
  const { crop, border, color } = input;
  const pad = Math.ceil(border) + 2;
  const fullW = crop.width + pad * 2, fullH = crop.height + pad * 2;
  const scale = Math.min(input.scale, MAX_SIDE / fullW, MAX_SIDE / fullH);
  const cw = Math.max(2, Math.ceil(fullW * scale)), ch = Math.max(2, Math.ceil(fullH * scale));
  const make = () => {
    const canvas = document.createElement("canvas");
    canvas.width = cw;
    canvas.height = ch;
    return { canvas, g: canvas.getContext("2d")! };
  };
  const tint = make();
  tint.g.drawImage(input.source, crop.x, crop.y, crop.width, crop.height, pad * scale, pad * scale, crop.width * scale, crop.height * scale);
  tint.g.globalCompositeOperation = "source-in";
  tint.g.fillStyle = color;
  tint.g.fillRect(0, 0, cw, ch);

  const out = make();
  out.g.drawImage(tint.canvas, 0, 0);
  // Stamp the silhouette around rings of growing radius; the rings overlap into a solid edge.
  for (const ring of [1, 0.66, 0.33]) {
    const radius = border * scale * ring;
    const steps = Math.min(96, Math.max(24, Math.ceil(radius * 1.6)));
    for (let i = 0; i < steps; i++) {
      const angle = (i / steps) * Math.PI * 2;
      out.g.drawImage(tint.canvas, Math.cos(angle) * radius, Math.sin(angle) * radius);
    }
  }
  return { canvas: out.canvas, scale, pad };
}
