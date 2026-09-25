import { z } from "zod";

/** A mockup template is geometry + documented image permission, never just a photo URL. */
export const mockupTemplateSchema = z.object({
  id: z.string().min(1).max(100),
  version: z.number().int().positive(),
  blankId: z.string().min(1).max(100),
  position: z.string().min(1).max(40),
  photo: z.object({
    reference: z.string().min(1).max(500),
    rights: z.enum(["documented_permission", "provider_catalog_terms"]),
    attribution: z.string().min(1).max(300),
  }),
  /** Clockwise print-area corners, normalized to the photo bounds. */
  quad: z.tuple([z.object({ x: z.number().min(0).max(1), y: z.number().min(0).max(1) }), z.object({ x: z.number().min(0).max(1), y: z.number().min(0).max(1) }), z.object({ x: z.number().min(0).max(1), y: z.number().min(0).max(1) }), z.object({ x: z.number().min(0).max(1), y: z.number().min(0).max(1) })]),
  blend: z.enum(["source-over", "multiply"]).default("multiply"),
  artworkOpacity: z.number().min(0).max(1).default(1),
});
export type MockupTemplate = z.infer<typeof mockupTemplateSchema>;

const registry = new Map<string, MockupTemplate>();
export function registerMockupTemplate(input: MockupTemplate) {
  const template = mockupTemplateSchema.parse(input);
  registry.set(`${template.blankId}:${template.position}`, template);
}
export function getMockupTemplate(blankId: string, position?: string) {
  return registry.get(`${blankId}:${position ?? "front"}`) ?? null;
}
export function mockupTemplateCount() { return registry.size; }
