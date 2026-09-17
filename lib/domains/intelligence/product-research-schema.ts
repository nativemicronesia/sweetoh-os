import { z } from "zod";
import { PRODUCT_CATEGORIES } from "@/lib/domains/catalog/categories";

export const researchSchema = z.object({
  title: z.string().min(1).max(180),
  description: z.string().min(1).max(5000),
  category: z.enum(PRODUCT_CATEGORIES),
  identity: z.enum(["matched", "likely", "unknown"]),
  brand: z.string().nullable(),
  model: z.string().nullable(),
  evidence: z.string(),
  specifications: z.array(z.object({ label: z.string(), value: z.string(), sourceUrl: z.string().url() })).max(30),
  sources: z.array(z.object({ title: z.string(), url: z.string().url() })).max(10),
  unknowns: z.array(z.string()).max(20),
  mockupPrompt: z.string().max(3000),
});
export type ProductResearch = z.infer<typeof researchSchema>;

export function safeSourceUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === "https:" && !u.username && !u.password &&
      !/^(localhost|127\.|10\.|192\.168\.|169\.254\.|\[|0\.)/i.test(u.hostname) &&
      !u.hostname.endsWith(".local");
  } catch { return false; }
}

// A model's invented URL is not evidence. Keep only URLs actually returned by search.
export function groundResearch(value: unknown, retrievedUrls: string[]): ProductResearch {
  const parsed = researchSchema.parse(value);
  const retrieved = new Set(retrievedUrls.filter(safeSourceUrl));
  const sources = parsed.sources.filter(s => retrieved.has(s.url));
  const allowed = new Set(sources.map(s => s.url));
  const specifications = parsed.specifications.filter(s => allowed.has(s.sourceUrl));
  return { ...parsed, sources, specifications,
    identity: sources.length ? parsed.identity : "unknown",
    unknowns: sources.length ? parsed.unknowns : [...parsed.unknowns, "Exact product identity has no retrieved source. Confirm the label before using branded specifications."],
  };
}

export type BuilderRecord = {
  kind: "partner_product_builder";
  purpose: "blank" | "finished";
  fingerprint: string;
  research: ProductResearch | null;
  confirmed: boolean;
  mockupAssetId?: string;
};

export function builderRecord(value: unknown): BuilderRecord | null {
  if (!value || typeof value !== "object" || !("kind" in value) || value.kind !== "partner_product_builder") return null;
  return value as BuilderRecord;
}
