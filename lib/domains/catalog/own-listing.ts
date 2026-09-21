import { and, eq } from "drizzle-orm";
import sharp from "sharp";
import { getDb } from "@/lib/db/client";
import { product } from "@/lib/db/schema";
import type { SessionUser } from "@/lib/domains/identity/types";
import { ValidationError } from "@/lib/shared/errors";
import { approveAsset, createAssetWithUpload } from "@/lib/domains/assets/service";
import { addProductMediaUpload, createProduct, publishProduct } from "./service";
import type { ProductCategory } from "./categories";

/**
 * "Add a product I already make."
 *
 * The partner photographs something she already sells, names it, sets her own
 * price, and it becomes a real listing. No AI is required anywhere in this
 * path — Skink is there if she wants a hand with the words, nothing more.
 */
export const LISTING_MAX_PHOTOS = 6;

function slugify(input: string) {
  return (
    input
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "product"
  );
}

async function uniqueSlug(ventureId: string, name: string) {
  const db = getDb();
  const base = slugify(name);
  let candidate = base;
  for (let n = 2; ; n++) {
    const [taken] = await db
      .select({ id: product.id })
      .from(product)
      .where(and(eq(product.ventureId, ventureId), eq(product.slug, candidate)))
      .limit(1);
    if (!taken) return candidate;
    candidate = `${base}-${n}`;
  }
}

/**
 * Phone photos arrive sideways, enormous, and often as HEIC. Straighten,
 * shrink and convert every one of them so nothing downstream has to care.
 */
export async function normalizePhoto(file: Buffer): Promise<{ bytes: Buffer; mimeType: string }> {
  try {
    const bytes = await sharp(file, { limitInputPixels: 80_000_000 })
      .rotate()
      .resize(2000, 2000, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 88 })
      .toBuffer();
    return { bytes, mimeType: "image/jpeg" };
  } catch {
    throw new ValidationError(
      "That photo couldn't be read. If it came from an iPhone, try again — or set Settings → Camera → Formats to “Most Compatible”.",
    );
  }
}

export async function listOwnProduct(
  session: SessionUser,
  input: {
    name: string;
    priceCents: number;
    description: string | null;
    category: ProductCategory;
    photos: { file: Buffer; filename: string }[];
    publish: boolean;
  },
) {
  if (session.role !== "partner" && session.role !== "owner") {
    throw new ValidationError("Only the shop partner can list products here.");
  }
  const name = input.name.trim();
  if (name.length < 2) throw new ValidationError("Give the product a name.");
  if (!Number.isFinite(input.priceCents) || input.priceCents < 50) throw new ValidationError("Set a price of at least $0.50.");
  if (!input.photos.length) throw new ValidationError("Add at least one photo.");
  if (input.photos.length > LISTING_MAX_PHOTOS) throw new ValidationError(`Up to ${LISTING_MAX_PHOTOS} photos per product.`);

  const photos = await Promise.all(input.photos.map(async (p) => ({ ...(await normalizePhoto(p.file)), filename: p.filename })));

  // Publishing a Sweet'Oh product needs an approved source asset behind it,
  // so her main photo becomes that asset.
  const source = await createAssetWithUpload({
    ventureId: session.ventureId,
    ventureSlug: session.ventureSlug,
    uploadedById: session.appUser.id,
    name: `${name} — product photo`,
    assetType: "product_asset",
    file: photos[0].bytes,
    filename: "product.jpg",
    mimeType: photos[0].mimeType,
    notes: "Photographed by the shop",
  });
  await approveAsset({ ventureId: session.ventureId, assetId: source.id, approvedById: session.appUser.id });

  const created = await createProduct({
    ventureId: session.ventureId,
    sourceAssetId: source.id,
    slug: await uniqueSlug(session.ventureId, name),
    name,
    description: input.description?.trim() || null,
    priceCents: input.priceCents,
    category: input.category,
    fulfillmentType: "sweetoh",
    actorUserId: session.appUser.id,
  });

  // The first photo is what the shop shows; the rest are extra angles.
  for (const [index, photo] of photos.entries()) {
    await addProductMediaUpload({
      ventureId: session.ventureId,
      ventureSlug: session.ventureSlug,
      productId: created.id,
      actorUserId: session.appUser.id,
      file: photo.bytes,
      filename: `photo-${index + 1}.jpg`,
      mimeType: photo.mimeType,
    });
  }

  if (input.publish) {
    await publishProduct({ ventureId: session.ventureId, productId: created.id, actorUserId: session.appUser.id });
  }

  return created;
}
