import { TEXT_EFFECT_KINDS, TEXT_WARP_KINDS } from "@/lib/studio/text-effects";
import { z } from "zod";
import { STUDIO_ASSET_IDS } from "@/lib/studio/asset-library-client";
import { isStudioIconId } from "@/lib/studio/icon-sets";
import { studioBrushPresetSchema } from "@/lib/studio/drawing-brushes";
import { CONFIRMED_SHOP_METHODS } from "@/lib/domains/production/methods";

export const areaSchema = z
  .object({
    x: z.number().min(0).max(1),
    y: z.number().min(0).max(1),
    width: z.number().min(0.001).max(1),
    height: z.number().min(0.001).max(1),
  })
  .refine(
    (a) => a.x + a.width <= 1.001 && a.y + a.height <= 1.001,
    "Keep the print area inside the image.",
  );
/** Partner-authored production geometry; points are relative to the area's box. */
export const printRegionSchema = z.object({
  id: z.string().min(1).max(80),
  name: z.string().trim().min(1).max(60),
  /** The partner-confirmed method used for this specific physical region. */
  productionMethod: z.enum(CONFIRMED_SHOP_METHODS).optional(),
  bounds: areaSchema,
  shape: z.enum(["rectangle", "ellipse", "polygon"]),
  points: z.array(z.object({ x: z.number().min(0).max(1), y: z.number().min(0).max(1) })).min(3).max(32).optional(),
  dimensions: z.object({ width: z.number().positive().max(1200), height: z.number().positive().max(1200), unit: z.enum(["in", "cm"]) }).optional(),
}).refine(a => a.shape !== "polygon" || Boolean(a.points?.length), "Draw at least three points for a custom shape.");
export type PrintRegion = z.infer<typeof printRegionSchema>;
export function regionsFor(surface: StudioSurface): PrintRegion[] {
  return surface.printRegions ?? [{ id: "default", name: "Print area", bounds: surface.area, shape: "rectangle" }];
}

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
  /** Optional uploaded reference photo kept separate from a trusted production blank. */
  referenceAssetId: z.string().uuid().nullable().optional(),
  /** Whether the view photo is an actual blank, or a separate reference/mockup. */
  imageRole: z.enum(["production_blank", "catalog_reference", "customer_mockup", "unverified"]).optional(),
  /** Supplier/catalog photo for reference; never assumed to be a production blank. */
  imageUrl: catalogImageUrl.nullable().optional(),
  /** Print area position on the product (front, back, left_sleeve…). */
  position: z.string().max(40).optional(),
  area: areaSchema,
  /** Missing means a legacy rectangle; an empty list means no printable area. */
  printRegions: z.array(printRegionSchema).max(24).refine(a => new Set(a.map(r => r.id)).size === a.length, "Area IDs must be unique.").optional(),
});
const placement = {
  printRegionId: z.string().min(1).max(80).optional(),
  /** Logical persisted group identity; groups remain ordinary independently editable layers. */
  groupId: z.string().uuid().optional(),
  hidden: z.boolean().optional(),
  locked: z.boolean().optional(),
  id: z.string().min(1).max(80),
  x: z.number().finite().min(-720).max(1440),
  y: z.number().finite().min(-720).max(1440),
  scaleX: z.number().positive().max(100),
  scaleY: z.number().positive().max(100),
  angle: z.number().finite().min(-360).max(360),
  opacity: z.number().min(0).max(1).optional(),
  /** User-authored soft depth effect; persisted as editable values. */
  shadow: z.object({ color: z.string().regex(/^#[0-9a-f]{6}$/i), opacity: z.number().min(0).max(1), blur: z.number().min(0).max(80), offsetX: z.number().min(-100).max(100), offsetY: z.number().min(-100).max(100) }).optional(),
  flipX: z.boolean().optional(),
  flipY: z.boolean().optional(),
};
const hexColor = z.string().regex(/^#[0-9a-f]{6}$/i);
const textWarpSchema = z.object({ kind: z.enum(TEXT_WARP_KINDS), amount: z.number().min(-100).max(100) });
const textEffectSchema = z.object({ kind: z.enum(TEXT_EFFECT_KINDS), color: z.string().regex(/^#[0-9a-f]{6}$/i).optional(), accent: z.string().regex(/^#[0-9a-f]{6}$/i).optional(), amount: z.number().min(0).max(100).optional() });
const drawingBrush = z.enum(["pencil", "marker", "dashed"]);
const pressurePoint = z.object({ x: z.number().finite().min(0).max(720), y: z.number().finite().min(0).max(720), pressure: z.number().min(0).max(1) });
const linearGradient = z.object({ from: hexColor, to: hexColor, direction: z.enum(["horizontal", "vertical", "diagonal"]).default("diagonal") });
const imageAdjustments = z.object({ brightness: z.number().min(-1).max(1), contrast: z.number().min(-1).max(1), saturation: z.number().min(-1).max(1), temperature: z.number().min(-1).max(1), blur: z.number().min(0).max(0.2) }).partial();
export const SHAPE_KINDS = ["rect", "rounded", "circle", "oval", "triangle", "star", "burst", "heart", "hexagon", "arrow", "line"] as const;
export const layerSchema = z.discriminatedUnion("kind", [
  z.object({
    ...placement,
    kind: z.literal("graphic"),
    /** Stable key into the vetted Studio asset registry. */
    assetKey: z.string().min(1).max(80).refine((key) => STUDIO_ASSET_IDS.has(key), "Unknown Studio graphic."),
  }),
  z.object({
    ...placement,
    kind: z.literal("icon"),
    /** Iconify id from an allowlisted open set, e.g. "ph:sun-bold". */
    icon: z.string().max(80).refine(isStudioIconId, "Unknown icon."),
    /** Recolor for single-color icons; stickers keep their own colors. */
    color: hexColor.optional(),
  }),
  z.object({
    ...placement,
    kind: z.literal("image"),
    assetId: z.string().uuid(),
    mask: z.enum(["circle", "rounded"]).optional(),
    adjustments: imageAdjustments.optional(),
    /** Crop window in the source image's pixels. */
    crop: z
      .object({ x: z.number().min(0), y: z.number().min(0), width: z.number().positive(), height: z.number().positive() })
      .optional(),
  }),
  z.object({
    ...placement,
    kind: z.literal("shape"),
    shape: z.enum(SHAPE_KINDS),
    /** A color, or "none" for an outline-only shape. */
    fill: hexColor.or(z.literal("none")),
    stroke: hexColor.optional(),
    strokeWidth: z.number().min(0).max(100).optional(),
    gradient: linearGradient.optional(),
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
    italic: z.boolean().optional(),
    textAlign: z.enum(["left", "center", "right", "justify"]).optional(),
    lineHeight: z.number().min(0.8).max(3).optional(),
    textBoxWidth: z.number().positive().max(1440).optional(),
    letterSpacing: z.number().min(-100).max(500).optional(),
    /** Text on an arc: positive arches up, negative bows down, 0 is straight. */
    curve: z.number().min(-100).max(100).optional(),
    outline: hexColor.optional(),
    outlineWidth: z.number().min(0).max(24).optional(),
    /** A finish drawn on the text: depth, glow, foil, worn print… (see lib/studio/text-effects.ts). */
    effect: textEffectSchema.optional(),
    /** Reshapes the text: wave, flag, bulge… */
    warp: textWarpSchema.optional(),
  }),
  z.object({
    ...placement,
    kind: z.literal("drawing"),
    /** Fabric SVG path grammar only; never raw SVG or markup. */
    pathData: z.string().min(4).max(16000).regex(/^[MmLlQqCcZz0-9\s.,+-]+$/),
    stroke: hexColor,
    strokeWidth: z.number().min(1).max(50),
    /** Built-in drawing behavior; missing means pencil for older designs. */
    brush: drawingBrush.optional(),
    /** Local stylus samples for reproducible variable-width strokes. */
    pressurePoints: z.array(pressurePoint).min(1).max(240).optional(),
    /** Full immutable preset snapshot makes custom artwork independent of local preset edits. */
    brushPreset: studioBrushPresetSchema.optional(),
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
    "Surface IDs must be unique.",
  );
export type StudioLayout = z.infer<typeof studioLayoutSchema>;
export type StudioLayer = z.infer<typeof layerSchema>;
export type StudioSurface = z.infer<typeof surfaceSchema>;

function stableSerialize(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(",")}]`;
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableSerialize(record[key])}`).join(",")}}`;
  }
  return JSON.stringify(value) ?? "undefined";
}

/** Product drafts store production geometry while the linked design asset keeps editable layers. */
export function productPrintAreaFromStudio(studio: StudioLayout) {
  const { area } = studio.surfaces[0];
  return {
    ...area,
    surfaces: studio.surfaces.map(({ layers: _surfaceLayers, ...surface }) => surface),
  };
}

/** Require the editor and target draft to use the same verified production surface geometry. */
export function studioMatchesProductPrintArea(studio: StudioLayout, printArea: {
  surfaces?: StudioSurface[];
} | null | undefined): boolean {
  const target = printArea?.surfaces;
  const parsedStudio = studioLayoutSchema.safeParse(studio);
  const parsedTarget = z.array(surfaceSchema).min(1).max(12).safeParse(target);
  if (!parsedStudio.success || !parsedTarget.success || parsedTarget.data.length !== parsedStudio.data.surfaces.length) return false;
  const geometry = (surface: StudioSurface) => ({
    id: surface.id,
    position: surface.position ?? surface.id,
    assetId: surface.assetId,
    area: surface.area,
    printRegions: surface.printRegions ?? [],
  });
  return parsedStudio.data.surfaces.every((surface, index) =>
    stableSerialize(geometry(surface)) === stableSerialize(geometry(parsedTarget.data[index])),
  );
}

export type SurfaceImageRole = NonNullable<StudioSurface["imageRole"]>;
export const PRODUCTION_BLANK_ASSET_NOTES = "Background removed; reusable blank view.";

export function isVerifiedProductionBlankAssetNotes(notes: string | null | undefined): boolean {
  return notes === PRODUCTION_BLANK_ASSET_NOTES;
}

/** Resolve untagged historical surfaces without mistaking supplier photos for clean blanks. */
export function inferSurfaceImageRole(input: {
  imageRole?: SurfaceImageRole;
  assetId: string | null;
  imageUrl?: string | null;
  catalogImages?: string[];
  assetNotes?: string | null;
}): SurfaceImageRole {
  if (input.imageRole) return input.imageRole;
  if (input.assetId && isVerifiedProductionBlankAssetNotes(input.assetNotes)) return "production_blank";
  if (input.assetNotes?.startsWith("AI-generated visual preview.")) return "customer_mockup";
  if (input.imageUrl && input.catalogImages?.includes(input.imageUrl)) return "catalog_reference";
  return "unverified";
}

/** Product canvas background is sourced only from an explicitly trusted production blank asset. */
export function productionSurfacePhoto(
  surface: Pick<StudioSurface, "imageRole" | "assetId">,
  signedUrls: Record<string, string>,
): string | null {
  if (surface.imageRole !== "production_blank" || !surface.assetId) return null;
  return signedUrls[surface.assetId] ?? null;
}
export const defaultArea = { x: 0.25, y: 0.25, width: 0.5, height: 0.5 };
