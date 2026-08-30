import sharp from "sharp";

const CANVAS = 1024;

/**
 * Deterministic Printify-style mockup: blank as stage, design centered
 * on the printable area at a comfortable default scale.
 */
export async function compositeDesignOnBlank(input: {
  blankBuffer: Buffer;
  designBuffer: Buffer;
  /** Fraction of canvas width for the design (default ~Printify chest print). */
  designScale?: number;
}): Promise<Buffer> {
  const scale = input.designScale ?? 0.42;

  const base = await sharp(input.blankBuffer)
    .resize(CANVAS, CANVAS, {
      fit: "contain",
      background: { r: 244, g: 244, b: 245, alpha: 1 },
    })
    .png()
    .toBuffer();

  const designBuf = await sharp(input.designBuffer)
    .resize({
      width: Math.round(CANVAS * scale),
      height: Math.round(CANVAS * scale),
      fit: "inside",
    })
    .ensureAlpha()
    .png()
    .toBuffer();

  const designMeta = await sharp(designBuf).metadata();
  const tw = designMeta.width ?? Math.round(CANVAS * scale);
  const th = designMeta.height ?? Math.round(CANVAS * scale);

  return sharp(base)
    .composite([
      {
        input: designBuf,
        left: Math.round((CANVAS - tw) / 2),
        top: Math.round((CANVAS - th) / 2) - Math.round(CANVAS * 0.04),
      },
    ])
    .png()
    .toBuffer();
}
