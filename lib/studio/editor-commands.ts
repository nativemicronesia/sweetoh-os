import { TEXT_EFFECT_KINDS, TEXT_WARP_KINDS } from "@/lib/studio/text-effects";
import { z } from "zod";
import { SHAPE_KINDS } from "@/lib/domains/catalog/studio-layout";
import { STUDIO_ASSET_IDS } from "./asset-library-client";
import { isStudioFontKey } from "./font-provenance";
import { regionsFor, type StudioLayout, type StudioLayer } from "@/lib/domains/catalog/studio-layout";

const fontKeySchema = z.string().max(40).refine(isStudioFontKey, "Choose an available Studio font.");

/** Serializable intent boundary shared by buttons now and an AI assistant later. */
export const studioEditorCommandSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("add_graphic"), assetKey: z.string().refine((key) => STUDIO_ASSET_IDS.has(key)) }).strict(),
  z.object({ type: z.literal("add_library_asset"), assetId: z.string().uuid() }).strict(),
  z.object({ type: z.literal("add_shape"), shape: z.enum(SHAPE_KINDS) }).strict(),
  z.object({ type: z.literal("add_background"), color: z.string().regex(/^#[0-9a-f]{6}$/i) }).strict(),
  z.object({ type: z.literal("add_text"), text: z.string().min(1).max(120), font: fontKeySchema.optional() }).strict(),
  z.object({ type: z.literal("duplicate") }).strict(),
  z.object({ type: z.literal("delete") }).strict(),
  z.object({ type: z.literal("undo") }).strict(),
  z.object({ type: z.literal("redo") }).strict(),
  z.object({ type: z.literal("align"), edge: z.enum(["left", "hcenter", "right", "top", "vcenter", "bottom"]) }).strict(),
  z.object({ type: z.literal("align_canvas"), layerIds: z.array(z.string().min(1).max(80)).min(1).max(30), edge: z.enum(["left", "hcenter", "right", "top", "vcenter", "bottom"]) }).strict(),
  z.object({ type: z.literal("move"), dx: z.number().finite().min(-720).max(720), dy: z.number().finite().min(-720).max(720) }).strict(),
  z.object({ type: z.literal("resize"), width: z.number().positive().max(2000), height: z.number().positive().max(2000), keepRatio: z.boolean().default(true) }).strict(),
  z.object({ type: z.literal("rotate"), degrees: z.number().finite().min(-360).max(360) }).strict(),
  z.object({ type: z.literal("flip"), axis: z.enum(["x", "y"]) }).strict(),
  z.object({ type: z.literal("crop_image"), x: z.number().min(0).max(100000), y: z.number().min(0).max(100000), width: z.number().positive().max(100000), height: z.number().positive().max(100000) }).strict(),
  z.object({ type: z.literal("make_pattern"), assetId: z.string().uuid().optional() }).strict(),
  z.object({ type: z.literal("set_layer_flags"), layerId: z.string().min(1).max(80), hidden: z.boolean().optional(), locked: z.boolean().optional() }).strict(),
  z.object({ type: z.literal("set_layer_order"), layerId: z.string().min(1).max(80), direction: z.enum(["forward", "backward", "front", "back"]) }).strict(),
  z.object({ type: z.literal("set_selection_order"), layerIds: z.array(z.string().min(1).max(80)).min(1).max(30), direction: z.enum(["forward", "backward", "front", "back"]) }).strict(),
  z.object({ type: z.literal("set_selection_flags"), layerIds: z.array(z.string().min(1).max(80)).min(1).max(30), hidden: z.boolean().optional(), locked: z.boolean().optional() }).strict(),
  z.object({ type: z.literal("group_selection"), layerIds: z.array(z.string().min(1).max(80)).min(2).max(30) }).strict(),
  z.object({ type: z.literal("ungroup_selection"), layerIds: z.array(z.string().min(1).max(80)).min(1).max(30) }).strict(),
  z.object({ type: z.literal("align_selection"), layerIds: z.array(z.string().min(1).max(80)).min(2).max(30), edge: z.enum(["left", "hcenter", "right", "top", "vcenter", "bottom"]) }).strict(),
  z.object({ type: z.literal("distribute_selection"), layerIds: z.array(z.string().min(1).max(80)).min(3).max(30), axis: z.enum(["horizontal", "vertical"]) }).strict(),
  z.object({ type: z.literal("set_opacity"), opacity: z.number().min(0).max(1) }).strict(),
  z.object({ type: z.literal("set_shape_style"), fill: z.string().regex(/^#[0-9a-f]{6}$/i).optional(), stroke: z.string().regex(/^#[0-9a-f]{6}$/i).nullable().optional(), strokeWidth: z.number().min(0).max(100).optional() }).strict(),
  z.object({ type: z.literal("set_shape_gradient"), from: z.string().regex(/^#[0-9a-f]{6}$/i), to: z.string().regex(/^#[0-9a-f]{6}$/i), direction: z.enum(["horizontal", "vertical", "diagonal"]).default("diagonal") }).strict(),
  z.object({ type: z.literal("set_image_sticker"), sticker: z.object({ color: z.string().regex(/^#[0-9a-f]{6}$/i), width: z.number().min(0).max(12) }).strict().nullable() }).strict(),
  z.object({ type: z.literal("set_text_warp"), warp: z.object({ kind: z.enum(TEXT_WARP_KINDS), amount: z.number().min(-100).max(100) }).strict().nullable() }).strict(),
  z.object({ type: z.literal("set_text_effect"), effect: z.object({ kind: z.enum(TEXT_EFFECT_KINDS), color: z.string().regex(/^#[0-9a-f]{6}$/i).optional(), accent: z.string().regex(/^#[0-9a-f]{6}$/i).optional(), amount: z.number().min(0).max(100).optional() }).strict().nullable(), color: z.string().regex(/^#[0-9a-f]{6}$/i).optional() }).strict(),
  z.object({ type: z.literal("set_text_style"), text: z.string().max(120).optional(), font: fontKeySchema.optional(), fontSize: z.number().min(12).max(120).optional(), color: z.string().regex(/^#[0-9a-f]{6}$/i).optional(), letterSpacing: z.number().min(-100).max(500).optional(), curve: z.number().min(-100).max(100).optional(), bold: z.boolean().optional(), italic: z.boolean().optional(), textAlign: z.enum(["left", "center", "right", "justify"]).optional(), lineHeight: z.number().min(0.8).max(3).optional(), textBoxWidth: z.number().positive().max(1440).optional(), outline: z.string().regex(/^#[0-9a-f]{6}$/i).nullable().optional(), outlineWidth: z.number().min(0).max(24).optional() }).strict(),
  z.object({ type: z.literal("set_image_adjustment"), field: z.enum(["brightness", "contrast", "saturation", "temperature", "blur"]), value: z.number().min(-1).max(1) }).strict(),
  z.object({ type: z.literal("set_image_mask"), mask: z.enum(["none", "circle", "rounded"]) }).strict(),
  z.object({ type: z.literal("set_shadow"), enabled: z.boolean(), blur: z.number().min(0).max(80).default(18), opacity: z.number().min(0).max(1).default(0.25), offsetX: z.number().min(-100).max(100).default(0), offsetY: z.number().min(-100).max(100).default(8) }).strict(),
  z.object({ type: z.literal("prepare_artwork"), regionId: z.string().min(1).max(80), fit: z.enum(["contain", "cover"]).default("contain") }).strict(),
]).superRefine((action, ctx) => {
  if (action.type === "set_selection_flags" && action.hidden === undefined && action.locked === undefined) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Choose at least one layer flag." });
  if (action.type === "set_image_adjustment" && action.field === "blur" && (action.value < 0 || action.value > 0.2)) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Blur must be between zero and 0.2." });
});
export type StudioEditorCommand = z.infer<typeof studioEditorCommandSchema>;

export type StudioTextNumberField = "fontSize" | "textBoxWidth";

/** Parse a completed typography control value, allowing incomplete digits while the user edits. */
export function parseStudioTextNumber(field: StudioTextNumberField, input: string): number | null {
  const raw = input.trim();
  if (!raw) return null;
  const value = Number(raw);
  const min = field === "fontSize" ? 12 : 60;
  const max = field === "fontSize" ? 120 : 1440;
  return Number.isFinite(value) && value >= min && value <= max ? value : null;
}

/** State available to an assistant. It is a read-only document snapshot, never a Fabric object reference. */
export const studioEditorStateSchema = z.object({
  revision: z.number().int().nonnegative(),
  surfaceId: z.string(),
  printRegions: z.array(z.object({ id: z.string(), name: z.string(), bounds: z.object({ x: z.number(), y: z.number(), width: z.number(), height: z.number() }) })),
  layers: z.array(z.object({ id: z.string(), kind: z.string(), name: z.string(), locked: z.boolean(), hidden: z.boolean(), geometry: z.record(z.string(), z.unknown()) })),
  selectedLayerIds: z.array(z.string()),
});

export function buildStudioEditorState(layout: StudioLayout, surfaceId: string, selectedLayerIds: string[], revision: number) {
  const surface = layout.surfaces.find((candidate) => candidate.id === surfaceId);
  if (!surface) throw new Error("Unknown Studio surface.");
  const describe = (layer: StudioLayer) => ({
    id: layer.id, kind: layer.kind,
    name: layer.kind === "text" ? layer.text : layer.kind === "graphic" ? layer.assetKey : layer.kind === "icon" ? layer.icon : layer.kind === "shape" ? layer.shape : layer.kind === "path" ? "Vector path" : layer.kind === "pattern" ? "Pattern" : "Artwork",
    locked: Boolean(layer.locked), hidden: Boolean(layer.hidden),
    geometry: { x: layer.x, y: layer.y, scaleX: layer.scaleX, scaleY: layer.scaleY, angle: layer.angle, opacity: layer.opacity ?? 1,
      ...(layer.groupId ? { groupId: layer.groupId } : {}),
      ...(layer.kind === "shape" ? { fill: layer.fill, stroke: layer.stroke, strokeWidth: layer.strokeWidth, gradient: layer.gradient } : {}),
      ...(layer.kind === "path" ? { fill: layer.fill, stroke: layer.stroke, strokeWidth: layer.strokeWidth } : {}),
      ...(layer.kind === "text" ? { text: layer.text, font: layer.font, fontSize: layer.fontSize, color: layer.color, bold: layer.bold, italic: layer.italic, textAlign: layer.textAlign, lineHeight: layer.lineHeight, textBoxWidth: layer.textBoxWidth, letterSpacing: layer.letterSpacing, curve: layer.curve, effect: layer.effect, warp: layer.warp } : {}),
      ...(layer.kind === "image" ? { assetId: layer.assetId, crop: layer.crop, adjustments: layer.adjustments, mask: layer.mask } : {}),
      ...(layer.kind === "graphic" ? { assetKey: layer.assetKey } : {}),
      ...(layer.kind === "pattern" ? { tile: layer.tile, gap: layer.gap, brick: layer.brick } : {}),
    },
  });
  const knownIds = new Set(surface.layers.map((layer) => layer.id));
  return studioEditorStateSchema.parse({ revision, surfaceId, printRegions: regionsFor(surface).map(({ id, name, bounds }) => ({ id, name, bounds })), layers: surface.layers.map(describe), selectedLayerIds: selectedLayerIds.filter((id) => knownIds.has(id)) });
}

export const studioEditorProposalSchema = z.object({
  summary: z.string().trim().min(1).max(500),
  actions: z.array(z.object({ targetLayerIds: z.array(z.string().min(1).max(80)).max(30).default([]), command: studioEditorCommandSchema })).max(12),
}).strict();
