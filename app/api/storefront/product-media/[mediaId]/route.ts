import { getDefaultVenture, getSessionUser } from "@/lib/domains/identity/service";
import { getActorProductDraft } from "@/lib/domains/intelligence/service";
import { getProductMediaAccessRecord } from "@/lib/domains/catalog/service";
import {
  canReadPrivateProductMedia,
  isPrivateProductMediaBucket,
  isPublishedProductMedia,
} from "@/lib/domains/catalog/product-media-access";
import { downloadFromBucket } from "@/lib/storage/client";

const notFound = () => new Response(null, { status: 404, headers: { "Cache-Control": "no-store" } });

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ mediaId: string }> },
) {
  const { mediaId } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(mediaId)) {
    return notFound();
  }

  const row = await getProductMediaAccessRecord(mediaId);
  if (!row?.media.assetId || !row.asset || !isPrivateProductMediaBucket(row.asset.bucket)) {
    return notFound();
  }

  const storefront = await getDefaultVenture();
  const publicForStorefront =
    row.product.ventureId === storefront.id &&
    isPublishedProductMedia(row.product, row.media, storefront.slug);

  if (!publicForStorefront) {
    const session = await getSessionUser().catch(() => null);
    const owned = session
      ? await getActorProductDraft({
          ventureId: session.ventureId,
          actorUserId: session.appUser.id,
          productId: row.product.id,
        }).then(Boolean).catch(() => false)
      : false;
    if (!canReadPrivateProductMedia({
      role: session?.role ?? null,
      sessionVentureId: session?.ventureId ?? null,
      productVentureId: row.product.ventureId,
      ownsDraft: owned,
      draftStatus: row.product.draftStatus,
    })) {
      return notFound();
    }
  }

  const mimeType = row.asset.mimeType?.toLowerCase() ?? "";
  if (!mimeType.startsWith("image/") || mimeType === "image/svg+xml") return notFound();

  try {
    const bytes = await downloadFromBucket({ bucket: row.asset.bucket, objectKey: row.asset.objectKey });
    return new Response(new Uint8Array(bytes), {
      status: 200,
      headers: {
        "Content-Type": mimeType,
        "Content-Length": String(bytes.byteLength),
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return notFound();
  }
}
