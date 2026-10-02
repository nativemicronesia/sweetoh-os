import sharp from "sharp";
import ImageTracer from "imagetracerjs";

export const VECTOR_COLORS = { min: 2, max: 32, default: 8 } as const;
const TRACE_SIDE = 1400;

/**
 * Turns raster artwork into flat-color vector art: reduces it to a small
 * palette and traces each color region into smooth paths. Returns the SVG
 * (a true vector file) and a crisp PNG of it for use on the canvas.
 */
export async function vectorizeImage(input: Buffer, colors: number = VECTOR_COLORS.default): Promise<{ svg: string; png: Buffer; width: number; height: number; paths: number }> {
  const count = Math.round(Math.min(VECTOR_COLORS.max, Math.max(VECTOR_COLORS.min, colors)));
  const resized = await sharp(input, { limitInputPixels: 40_000_000 })
    .rotate()
    .resize(TRACE_SIDE, TRACE_SIDE, { fit: "inside", withoutEnlargement: true })
    .ensureAlpha()
    .png()
    .toBuffer();
  // A perceptual palette (libimagequant) gives clean flat regions; tracing then follows exactly those colors.
  const reduced = await sharp(resized).png({ palette: true, colors: count, dither: 0, effort: 7 }).toBuffer();
  const { data, info } = await sharp(reduced).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const seen = new Map<number, { r: number; g: number; b: number; a: number }>();
  for (let i = 0; i < data.length; i += 4) {
    const key = ((data[i] << 24) | (data[i + 1] << 16) | (data[i + 2] << 8) | data[i + 3]) >>> 0;
    if (!seen.has(key)) seen.set(key, { r: data[i], g: data[i + 1], b: data[i + 2], a: data[i + 3] });
  }
  const pal = [...seen.values()].slice(0, VECTOR_COLORS.max);
  const svg = ImageTracer.imagedataToSVG(
    { width: info.width, height: info.height, data: new Uint8ClampedArray(data) },
    { pal, numberofcolors: pal.length, colorsampling: 0, ltres: 1, qtres: 1, pathomit: 10, blurradius: 0, strokewidth: 0, roundcoords: 1, scale: 1, viewbox: true, desc: false },
  );
  const png = await sharp(Buffer.from(svg), { density: 192 }).resize(info.width * 2, info.height * 2, { fit: "fill" }).png().toBuffer();
  return { svg, png, width: info.width, height: info.height, paths: (svg.match(/<path /g) ?? []).length };
}
