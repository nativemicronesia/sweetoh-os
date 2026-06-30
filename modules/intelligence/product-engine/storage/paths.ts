export const PRODUCT_ENGINE_BUCKET = "product-intelligence";

export function productIntelligenceObjectKey(
  productType: string,
  assetId: string,
  filename: string,
): string {
  const safeProductType = productType
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return `${safeProductType}/${assetId}-${filename}`;
}
