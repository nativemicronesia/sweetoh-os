export function designLibraryObjectKey(
  ventureSlug: string,
  assetId: string,
  filename: string,
): string {
  return `${ventureSlug}/${assetId}/${filename}`;
}

export function customerUploadObjectKey(
  ventureSlug: string,
  requestId: string,
  filename: string,
): string {
  return `${ventureSlug}/requests/${requestId}/${filename}`;
}

export function productMediaObjectKey(
  ventureSlug: string,
  productId: string,
  filename: string,
): string {
  return `${ventureSlug}/${productId}/${filename}`;
}

export const STORAGE_BUCKETS = {
  designLibrary: "design-library",
  productMedia: "product-media",
  customerUploads: "customer-uploads",
  digitalProducts: "digital-products",
} as const;

/** Buckets required for Sweet'Oh AI image intake (design-library + product-media). */
export const AI_IMAGE_INTAKE_BUCKETS = [
  STORAGE_BUCKETS.designLibrary,
  STORAGE_BUCKETS.productMedia,
] as const;

export const FOUNDATION_STORAGE_BUCKETS = [
  { name: STORAGE_BUCKETS.productMedia, public: true },
  { name: STORAGE_BUCKETS.designLibrary, public: false },
  { name: STORAGE_BUCKETS.customerUploads, public: false },
  { name: STORAGE_BUCKETS.digitalProducts, public: false },
] as const;
