import { z } from "zod";

export const areaSchema = z
  .object({
    x: z.number().min(0).max(1),
    y: z.number().min(0).max(1),
    width: z.number().min(0.02).max(1),
    height: z.number().min(0.02).max(1),
  })
  .refine(
    (a) => a.x + a.width <= 1.001 && a.y + a.height <= 1.001,
    "Keep the print area inside the image.",
  );
/** Catalog product photos come only from Printify's image CDN. */
export const catalogImageUrl = z
  .string()
  .url()
  .refine((u) => {
    const url = new URL(u);
    return url.protocol === "https:" && url.hostname === "images.printify.com";
  }, "Unsupported product photo.");
export const surfaceSchema = z.object({
  id: z.string().min(1).max(80),
  name: z.string().trim().min(1).max(60),
  assetId: z.string().uuid().nullable(),
  /** A catalog photo for this view, used when there's no uploaded photo. */
  imageUrl: catalogImageUrl.nullable().optional(),
  /** Print area position on the product (front, back, left_sleeve…). */
  position: z.string().max(40).optional(),
  area: areaSchema,
});
const placement = {
  id: z.string().min(1).max(80),
  x: z.number().finite().min(-720).max(1440),
  y: z.number().finite().min(-720).max(1440),
  scaleX: z.number().positive().max(100),
  scaleY: z.number().positive().max(100),
  angle: z.number().finite().min(-360).max(360),
  opacity: z.number().min(0).max(1).optional(),
  flipX: z.boolean().optional(),
  flipY: z.boolean().optional(),
};
const hexColor = z.string().regex(/^#[0-9a-f]{6}$/i);
export const SHAPE_KINDS = ["rect", "rounded", "circle", "triangle", "star", "heart", "line"] as const;
export const layerSchema = z.discriminatedUnion("kind", [
  z.object({
    ...placement,
    kind: z.literal("image"),
    assetId: z.string().uuid(),
    /** Crop window in the source image's pixels. */
    crop: z
      .object({ x: z.number().min(0), y: z.number().min(0), width: z.number().positive(), height: z.number().positive() })
      .optional(),
  }),
  z.object({
    ...placement,
    kind: z.literal("shape"),
    shape: z.enum(SHAPE_KINDS),
    fill: hexColor,
    width: z.number().positive().max(2000),
    height: z.number().positive().max(2000),
  }),
  z.object({
    ...placement,
    kind: z.literal("pattern"),
    assetId: z.string().uuid(),
    /** Tile width as a fraction of the print area width. */
    tile: z.number().min(0.03).max(1),
    /** Space between motifs as a fraction of the tile. */
    gap: z.number().min(0).max(0.9),
    brick: z.boolean(),
    width: z.number().positive().max(2000),
    height: z.number().positive().max(2000),
  }),
  z.object({
    ...placement,
    kind: z.literal("text"),
    text: z.string().max(120),
    color: z.string().regex(/^#[0-9a-f]{6}$/i),
    fontSize: z.number().min(12).max(120),
    /** Key into the editor's font list; missing means the default font. */
    font: z.string().max(40).optional(),
    bold: z.boolean().optional(),
  }),
]);
export const studioLayoutSchema = z
  .object({
    version: z.literal(1),
    surfaces: z
      .array(surfaceSchema.extend({ layers: z.array(layerSchema).max(50) }))
      .min(1)
      .max(12),
  })
  .refine(
    (v) => new Set(v.surfaces.map((s) => s.id)).size === v.surfaces.length,
    "Surface names must be unique.",
  );
export type StudioLayout = z.infer<typeof studioLayoutSchema>;
export type StudioLayer = z.infer<typeof layerSchema>;
export type StudioSurface = z.infer<typeof surfaceSchema>;
export const defaultArea = { x: 0.25, y: 0.25, width: 0.5, height: 0.5 };
