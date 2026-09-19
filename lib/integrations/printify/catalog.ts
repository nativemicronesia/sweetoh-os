import { z } from "zod";
import type { ProductCategory } from "@/lib/domains/catalog/categories";
import { colorHex, sortColors, sortSizes } from "@/lib/domains/catalog/variants";

const blueprintSchema = z.object({
  id: z.number().int(),
  title: z.string(),
  description: z.string().default(""),
  brand: z.string().default(""),
  model: z.string().default(""),
  images: z.array(z.string().url()),
});
export type Blueprint = z.infer<typeof blueprintSchema>;
let cached: { expires: number; rows: Blueprint[] } | undefined;
let pending: Promise<Blueprint[]> | undefined;

// Deliberately exposes only GET catalog blueprints. No shops, orders or fulfillment API.
async function readCatalog(path: string) {
  const token = process.env.PRINTIFY_API_TOKEN;
  if (!token) throw new Error("Printify catalog is not configured.");
  const response = await fetch(
    `https://api.printify.com/v1/catalog/blueprints${path}.json`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "User-Agent": "SweetOh-Local-Catalog",
      },
      signal: AbortSignal.timeout(20000),
      cache: "no-store",
    },
  );
  if (!response.ok)
    throw new Error(
      response.status === 429
        ? "Catalog is busy. Try again shortly."
        : "Couldn’t load the catalog. Please try again.",
    );
  return response.json();
}
export async function listPrintifyBlueprints(): Promise<Blueprint[]> {
  if (cached && cached.expires > Date.now()) return cached.rows;
  if (!pending)
    pending = readCatalog("")
      .then((data) => {
        const rows = z.array(blueprintSchema).parse(data);
        cached = { expires: Date.now() + 3600000, rows };
        return rows;
      })
      .finally(() => {
        pending = undefined;
      });
  return pending;
}
export async function getPrintifyBlueprint(id: number) {
  if (!Number.isSafeInteger(id) || id <= 0)
    throw new Error("Choose a valid catalog product.");
  const saved = cached?.rows.find((row) => row.id === id);
  return saved ?? blueprintSchema.parse(await readCatalog(`/${id}`));
}
export function catalogCategory(title: string): ProductCategory {
  if (/baby|infant|toddler|youth|kids|onesie/i.test(title)) return "kids";
  if (/mug|tumbler|bottle|glass|cup|stein/i.test(title)) return "drinkware";
  if (
    /shirt|tee\b|hoodie|sweat|tank|polo|jacket|pants|shorts|dress|legging|jersey|vest|pajama/i.test(
      title,
    )
  )
    return "apparel";
  if (
    /blanket|pillow|towel|poster|canvas|rug|mat\b|candle|ornament|clock|duvet|apron|coaster/i.test(
      title,
    ) &&
    !/bag|tote/i.test(title)
  )
    return "home";
  if (
    /bag|tote|cap|hat|case|sticker|notebook|sock|scarf|keychain|pin\b|backpack/i.test(
      title,
    )
  )
    return "accessories";
  return "custom";
}
export function plainCatalogDescription(html: string) {
  return html
    .replace(/<\/(p|div)>|<br\s*\/?\s*>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .trim();
}
export async function downloadCatalogImage(url: string) {
  const parsed = new URL(url);
  if (
    parsed.protocol !== "https:" ||
    parsed.hostname !== "images.printify.com" ||
    parsed.username ||
    parsed.password
  )
    throw new Error("Unsupported catalog image.");
  const response = await fetch(url, {
    redirect: "error",
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok || !response.body)
    throw new Error("Couldn’t download this product image. Try another view.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  const reader = response.body.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 10 * 1024 * 1024) {
        await reader.cancel();
        throw new Error("This image is too large. Choose another view.");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  return {
    bytes: Buffer.concat(chunks),
    mimeType:
      response.headers.get("content-type")?.split(";")[0] || "image/jpeg",
  };
}
const BESTSELLERS = [
  /^Unisex Heavy Cotton Tee$/i,
  /^Unisex Heavy Blend™ Hooded Sweatshirt$/i,
  /^Ceramic Mug, \(11oz, 15oz\)/i,
  /^Cotton Canvas Tote Bag$/i,
];
/** A few well-known blanks for quick-start tiles; empty if the catalog is down. */
export async function listBestsellerBlueprints(): Promise<Blueprint[]> {
  const rows = await listPrintifyBlueprints().catch(() => []);
  return BESTSELLERS.map((re) => rows.find((b) => re.test(b.title))).filter(
    (b): b is Blueprint => b !== undefined,
  );
}

const variantSchema = z.object({
  options: z.record(z.string(), z.string()).default({}),
  placeholders: z
    .array(z.object({ position: z.string(), width: z.number(), height: z.number() }))
    .default([]),
});
export type BlueprintOptions = {
  colors: { name: string; hex: string }[];
  sizes: string[];
  printAreas: { position: string; width: number; height: number }[];
};
const optionCache = new Map<number, { expires: number; value: Promise<BlueprintOptions> }>();

/**
 * Colors, sizes and print areas for a catalog product, merged across the
 * print providers Printify lists. The partner buys blanks herself, so the
 * union of what's offered is what she can choose from.
 */
export function getBlueprintOptions(id: number): Promise<BlueprintOptions> {
  if (!Number.isSafeInteger(id) || id <= 0)
    return Promise.reject(new Error("Choose a valid catalog product."));
  const hit = optionCache.get(id);
  if (hit && hit.expires > Date.now()) return hit.value;
  const value = (async () => {
    const providers = z
      .array(z.object({ id: z.number().int() }))
      .parse(await readCatalog(`/${id}/print_providers`));
    const lists = await Promise.all(
      providers.slice(0, 8).map(async (p) =>
        z
          .object({ variants: z.array(variantSchema) })
          .parse(await readCatalog(`/${id}/print_providers/${p.id}/variants`)).variants,
      ),
    );
    const colors = new Set<string>();
    const sizes = new Set<string>();
    for (const v of lists.flat()) {
      if (v.options.color) colors.add(v.options.color);
      if (v.options.size) sizes.add(v.options.size);
    }
    // Print areas from the provider with the most variants (widest coverage).
    const richest = [...lists].sort((a, b) => b.length - a.length)[0] ?? [];
    const areas = new Map<string, { position: string; width: number; height: number }>();
    for (const p of richest.flatMap((v) => v.placeholders))
      if (!areas.has(p.position)) areas.set(p.position, p);
    return {
      colors: sortColors([...colors].map((name) => ({ name, hex: colorHex(name) }))),
      sizes: sortSizes([...sizes]),
      printAreas: [...areas.values()],
    };
  })();
  optionCache.set(id, { expires: Date.now() + 3_600_000, value });
  value.catch(() => optionCache.delete(id));
  return value;
}
