import type { AppRole } from "@/lib/domains/identity/types";

export type ProductMediaAccessProduct = {
  id: string;
  ventureId: string;
  active: boolean;
  draftStatus: string;
  brandVentureSlug: string;
};

export type ProductMediaAccessAsset = {
  assetId: string | null;
  objectKey: string | null;
};

export function isPublishedProductMedia(
  product: ProductMediaAccessProduct,
  media: ProductMediaAccessAsset,
  storefrontSlug: string,
): boolean {
  return Boolean(
    media.assetId &&
      !media.objectKey &&
      product.active &&
      product.draftStatus === "published" &&
      product.brandVentureSlug === storefrontSlug,
  );
}

/** Match the existing draft-owner and pending-review boundaries. */
export function canReadPrivateProductMedia(input: {
  role: AppRole | null;
  sessionVentureId: string | null;
  productVentureId: string;
  ownsDraft: boolean;
  draftStatus: string;
}): boolean {
  if (!input.role || input.sessionVentureId !== input.productVentureId) return false;
  if (input.role === "creator") return input.ownsDraft;
  return input.ownsDraft || input.draftStatus === "pending_review";
}

export function productMediaAccessUrl(mediaId: string): string {
  return `/api/storefront/product-media/${encodeURIComponent(mediaId)}`;
}

export function isPrivateProductMediaBucket(bucket: string): boolean {
  return bucket === "design-library" || bucket === "customer-uploads";
}
