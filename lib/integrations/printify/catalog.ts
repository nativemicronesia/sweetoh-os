import { z } from "zod";
import type { ProductCategory } from "@/lib/domains/catalog/categories";

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
