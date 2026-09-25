import { z } from "zod";
import { SHAPE_KINDS } from "@/lib/domains/catalog/studio-layout";
import { STUDIO_ASSET_IDS } from "./asset-library";

/** Serializable intent boundary shared by buttons now and an AI assistant later. */
export const studioEditorCommandSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("add_graphic"), assetKey: z.string().refine((key) => STUDIO_ASSET_IDS.has(key)) }).strict(),
  z.object({ type: z.literal("add_shape"), shape: z.enum(SHAPE_KINDS) }).strict(),
  z.object({ type: z.literal("add_background"), color: z.string().regex(/^#[0-9a-f]{6}$/i) }).strict(),
  z.object({ type: z.literal("add_text"), text: z.string().min(1).max(120), font: z.string().max(40).optional() }).strict(),
  z.object({ type: z.literal("duplicate") }).strict(),
  z.object({ type: z.literal("delete") }).strict(),
  z.object({ type: z.literal("undo") }).strict(),
  z.object({ type: z.literal("redo") }).strict(),
  z.object({ type: z.literal("align"), edge: z.enum(["left", "hcenter", "right", "top", "vcenter", "bottom"]) }).strict(),
]);
export type StudioEditorCommand = z.infer<typeof studioEditorCommandSchema>;
