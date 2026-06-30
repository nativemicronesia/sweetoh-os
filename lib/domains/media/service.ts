import { and, desc, eq, ilike } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { asset, product, productMedia } from "@/lib/db/schema";
import { getAssetById } from "@/lib/domains/assets/service";
import type { AssetStatus } from "@/lib/domains/assets/types";
import { NotFoundError } from "@/lib/shared/errors";
import {
  createSignedUrl,
  productMediaPublicUrl,
} from "@/lib/storage/client";
import { STORAGE_BUCKETS } from "@/lib/storage/paths";
import type {
  MediaLibraryFilters,
  MediaLibraryItem,
  MediaLibraryKind,
  MediaLibraryStats,
} from "./types";

function filenameFromObjectKey(objectKey: string): string {
  const parts = objectKey.split("/");
  return parts[parts.length - 1] ?? objectKey;
}

function mapAssetRow(row: typeof asset.$inferSelect): MediaLibraryItem {
  return {
    id: row.id,
    kind: "design_library",
    name: row.name,
    bucket: row.bucket,
    objectKey: row.objectKey,
    mimeType: row.mimeType,
    fileSizeBytes: row.fileSizeBytes,
    createdAt: row.createdAt,
    assetType: row.assetType,
    assetStatus: row.status as AssetStatus,
    notes: row.notes,
  };
}

function mapProductMediaRow(input: {
  media: typeof productMedia.$inferSelect;
  product: typeof product.$inferSelect;
}): MediaLibraryItem | null {
  if (!input.media.objectKey) {
    return null;
  }

  return {
    id: input.media.id,
    kind: "product_media",
    name: `${input.product.name} · ${filenameFromObjectKey(input.media.objectKey)}`,
    bucket: STORAGE_BUCKETS.productMedia,
    objectKey: input.media.objectKey,
    mimeType: null,
    fileSizeBytes: null,
    createdAt: input.media.createdAt,
    productId: input.product.id,
    productName: input.product.name,
    productSlug: input.product.slug,
    linkedAssetId: input.media.assetId,
    sortOrder: input.media.sortOrder,
  };
}

function matchesQuery(item: MediaLibraryItem, query: string): boolean {
  const normalized = query.trim().toLowerCase();

  if (!normalized) {
    return true;
  }

  return (
    item.name.toLowerCase().includes(normalized) ||
    item.objectKey.toLowerCase().includes(normalized) ||
    (item.productName?.toLowerCase().includes(normalized) ?? false) ||
    (item.productSlug?.toLowerCase().includes(normalized) ?? false)
  );
}

function matchesMimePrefix(item: MediaLibraryItem, mimePrefix: string): boolean {
  if (!mimePrefix) {
    return true;
  }

  if (!item.mimeType) {
    return mimePrefix === "image/" && /\.(png|jpe?g|gif|webp|svg)$/i.test(item.objectKey);
  }

  return item.mimeType.startsWith(mimePrefix);
}

export async function listMediaLibrary(input: {
  ventureId: string;
  filters?: MediaLibraryFilters;
}): Promise<MediaLibraryItem[]> {
  const filters = input.filters ?? {};
  const kind = filters.kind ?? "all";
  const items: MediaLibraryItem[] = [];
  const db = getDb();

  if (kind === "all" || kind === "design_library") {
    const conditions = [eq(asset.ventureId, input.ventureId)];

    if (filters.status) {
      conditions.push(eq(asset.status, filters.status));
    }

    if (filters.query?.trim()) {
      conditions.push(ilike(asset.name, `%${filters.query.trim()}%`));
    }

    const assetRows = await db
      .select()
      .from(asset)
      .where(and(...conditions))
      .orderBy(desc(asset.createdAt));

    for (const row of assetRows) {
      const item = mapAssetRow(row);

      if (matchesMimePrefix(item, filters.mimePrefix ?? "")) {
        items.push(item);
      }
    }
  }

  if (kind === "all" || kind === "product_media") {
    const mediaRows = await db
      .select({ media: productMedia, product })
      .from(productMedia)
      .innerJoin(product, eq(productMedia.productId, product.id))
      .where(eq(product.ventureId, input.ventureId))
      .orderBy(desc(productMedia.createdAt));

    for (const row of mediaRows) {
      const item = mapProductMediaRow(row);

      if (!item) {
        continue;
      }

      if (!matchesQuery(item, filters.query ?? "")) {
        continue;
      }

      if (!matchesMimePrefix(item, filters.mimePrefix ?? "")) {
        continue;
      }

      items.push(item);
    }
  }

  return items.sort(
    (left, right) => right.createdAt.getTime() - left.createdAt.getTime(),
  );
}

export async function getMediaLibraryStats(
  ventureId: string,
): Promise<MediaLibraryStats> {
  const items = await listMediaLibrary({ ventureId });
  const designLibraryCount = items.filter(
    (item) => item.kind === "design_library",
  ).length;
  const productMediaCount = items.filter(
    (item) => item.kind === "product_media",
  ).length;
  const imageCount = items.filter((item) =>
    matchesMimePrefix(item, "image/"),
  ).length;
  const draftAssetCount = items.filter(
    (item) => item.kind === "design_library" && item.assetStatus === "draft",
  ).length;

  return {
    total: items.length,
    designLibraryCount,
    productMediaCount,
    imageCount,
    draftAssetCount,
  };
}

export async function getDesignLibraryMediaItem(input: {
  ventureId: string;
  assetId: string;
}): Promise<MediaLibraryItem> {
  const row = await getAssetById(input);
  return mapAssetRow(row);
}

export async function getProductMediaLibraryItem(input: {
  ventureId: string;
  mediaId: string;
}): Promise<MediaLibraryItem> {
  const db = getDb();
  const [row] = await db
    .select({ media: productMedia, product })
    .from(productMedia)
    .innerJoin(product, eq(productMedia.productId, product.id))
    .where(
      and(
        eq(productMedia.id, input.mediaId),
        eq(product.ventureId, input.ventureId),
      ),
    )
    .limit(1);

  if (!row) {
    throw new NotFoundError("Media item not found");
  }

  const item = mapProductMediaRow(row);

  if (!item) {
    throw new NotFoundError("Media item not found");
  }

  return item;
}

export async function resolveMediaPreviewUrl(
  item: Pick<MediaLibraryItem, "bucket" | "objectKey" | "mimeType">,
): Promise<string | null> {
  if (!item.objectKey) {
    return null;
  }

  const isImage =
    item.mimeType?.startsWith("image/") ||
    /\.(png|jpe?g|gif|webp|svg)$/i.test(item.objectKey);

  if (!isImage) {
    return null;
  }

  if (item.bucket === STORAGE_BUCKETS.productMedia) {
    return productMediaPublicUrl(item.objectKey);
  }

  return createSignedUrl({
    bucket: item.bucket,
    objectKey: item.objectKey,
    expiresInSeconds: 3600,
  });
}

export function mediaLibraryDetailPath(item: Pick<MediaLibraryItem, "id" | "kind">): string {
  return item.kind === "design_library"
    ? `/owner/media/asset/${item.id}`
    : `/owner/media/product/${item.id}`;
}

export function mediaLibraryKindLabel(kind: MediaLibraryKind): string {
  return kind === "design_library" ? "Design Library" : "Product media";
}
