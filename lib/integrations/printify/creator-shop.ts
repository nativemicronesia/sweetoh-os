/**
 * A creator's OWN Printify account. Sweet'Oh's catalog token stays read-only
 * (./catalog.ts); this module only ever uses the token a creator pasted in, to
 * create products in the creator's own shop. It never places orders.
 */
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import { ValidationError } from "@/lib/shared/errors";

const API = "https://api.printify.com/v1";

function secretKey() {
  const raw = process.env.CREATOR_SECRETS_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!raw) throw new Error("No key available to protect creator tokens.");
  return createHash("sha256").update(`sweetoh-creator-secrets:${raw}`).digest();
}

export function encryptToken(token: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", secretKey(), iv);
  const data = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64"), cipher.getAuthTag().toString("base64"), data.toString("base64")].join(":");
}

export function decryptToken(sealed: string) {
  const [v, iv, tag, data] = sealed.split(":");
  if (v !== "v1" || !iv || !tag || !data) throw new Error("Unreadable token.");
  const decipher = createDecipheriv("aes-256-gcm", secretKey(), Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(data, "base64")), decipher.final()]).toString("utf8");
}

async function call<T>(token: string, path: string, init?: { method?: string; body?: unknown }, schema?: { parse: (value: unknown) => T }): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: init?.method ?? "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "User-Agent": "SweetOh-Creator-Studio",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
    },
    body: init?.body ? JSON.stringify(init.body) : undefined,
    signal: AbortSignal.timeout(60_000),
    cache: "no-store",
  });
  if (res.status === 401 || res.status === 403) throw new ValidationError("Printify didn't accept your token. Create a new one in Printify (My account → Connections) and connect again.");
  if (res.status === 429) throw new ValidationError("Printify is busy right now. Try again in a minute.");
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error("printify_creator_call_failed", { path: path.replace(/\d+/g, ":id"), status: res.status, detail: detail.slice(0, 400) });
    throw new ValidationError("Printify couldn't finish that. Check your product and try again.");
  }
  const json = await res.json();
  return schema ? schema.parse(json) : (json as T);
}

const shopsSchema = z.array(z.object({ id: z.number(), title: z.string(), sales_channel: z.string().nullish() }));

export async function listCreatorShops(token: string) {
  return call(token, "/shops.json", undefined, shopsSchema);
}

const variantSchema = z.object({
  id: z.number(),
  title: z.string().default(""),
  options: z.record(z.string(), z.string()).default({}),
  placeholders: z.array(z.object({ position: z.string(), width: z.number(), height: z.number() })).default([]),
});

async function providerVariants(token: string, blueprintId: number) {
  const providers = await call(token, `/catalog/blueprints/${blueprintId}/print_providers.json`, undefined, z.array(z.object({ id: z.number(), title: z.string() })));
  return Promise.all(
    providers.slice(0, 10).map(async (p) => ({
      provider: p,
      variants: (await call(token, `/catalog/blueprints/${blueprintId}/print_providers/${p.id}/variants.json`, undefined, z.object({ variants: z.array(variantSchema) }))).variants,
    })),
  );
}

export type SendToPrintifyInput = {
  token: string;
  shopId: string;
  blueprintId: number;
  title: string;
  description: string;
  colors: string[];
  sizes: string[];
  /** Retail price in cents for the base size; per-size upcharges added on top. */
  priceCents: number;
  sizeUpchargeCents?: Record<string, number>;
  /** Signed, fetchable URLs of transparent print files, by Printify position. */
  prints: { position: string; url: string; fileName: string }[];
  tags?: string[];
};

/** Creates the product in the creator's Printify shop. Returns its Printify id and the provider used. */
export async function sendProductToPrintify(input: SendToPrintifyInput) {
  const catalog = await providerVariants(input.token, input.blueprintId);
  const wantColor = new Set(input.colors.map((c) => c.toLowerCase()));
  const wantSize = new Set(input.sizes.map((s) => s.toLowerCase()));
  const positions = new Set(input.prints.map((p) => p.position));
  const matches = (v: z.infer<typeof variantSchema>) =>
    (!wantColor.size || !v.options.color || wantColor.has(v.options.color.toLowerCase())) &&
    (!wantSize.size || !v.options.size || wantSize.has(v.options.size.toLowerCase()));
  // The provider that covers the most of what the creator picked, with the print positions they designed.
  const ranked = catalog
    .map((c) => {
      const picked = c.variants.filter(matches);
      const covered = new Set(picked.flatMap((v) => v.placeholders.map((p) => p.position)));
      const posHits = [...positions].filter((p) => covered.has(p)).length;
      return { ...c, picked, posHits };
    })
    .filter((c) => c.picked.length && c.posHits)
    .sort((a, b) => b.posHits - a.posHits || b.picked.length - a.picked.length);
  const best = ranked[0];
  if (!best) throw new ValidationError("No Printify print provider offers this product in the colors, sizes and print areas you chose. Try fewer colors or a different product.");

  const uploads = await Promise.all(
    input.prints
      .filter((p) => best.picked.some((v) => v.placeholders.some((ph) => ph.position === p.position)))
      .map(async (p) => ({
        position: p.position,
        image: await call(input.token, "/uploads/images.json", { method: "POST", body: { file_name: p.fileName, url: p.url } }, z.object({ id: z.string() })),
      })),
  );
  const variants = best.picked.slice(0, 100);
  const upcharge = (v: z.infer<typeof variantSchema>) => input.sizeUpchargeCents?.[v.options.size ?? ""] ?? 0;
  const product = await call(
    input.token,
    `/shops/${encodeURIComponent(input.shopId)}/products.json`,
    {
      method: "POST",
      body: {
        title: input.title.slice(0, 200),
        description: input.description.slice(0, 5000),
        blueprint_id: input.blueprintId,
        print_provider_id: best.provider.id,
        tags: (input.tags ?? []).slice(0, 13),
        variants: variants.map((v) => ({ id: v.id, price: input.priceCents + upcharge(v), is_enabled: true })),
        print_areas: [
          {
            variant_ids: variants.map((v) => v.id),
            placeholders: uploads.map((u) => ({ position: u.position, images: [{ id: u.image.id, x: 0.5, y: 0.5, scale: 1, angle: 0 }] })),
          },
        ],
      },
    },
    z.object({ id: z.string() }),
  );
  return { productId: product.id, provider: best.provider.title, variantCount: variants.length };
}
