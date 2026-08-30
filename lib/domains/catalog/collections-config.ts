import { PRODUCT_CATEGORY_META, type ProductCategory } from "./categories";

/**
 * Automatic storefront aisles — one collection per product category.
 * Manual collections (e.g. "featured") stay separate.
 */
export const AUTOMATIC_COLLECTIONS = PRODUCT_CATEGORY_META.map((item) => ({
  slug: item.slug,
  name: item.label,
  ruleKey: item.value,
  category: item.value,
  blurb: item.blurb,
})) as ReadonlyArray<{
  slug: string;
  name: string;
  ruleKey: ProductCategory;
  category: ProductCategory;
  blurb: string;
}>;

/** Retired Island Sprouts–era automatic collection slugs (deactivated on migrate). */
export const LEGACY_AUTOMATIC_COLLECTION_SLUGS = [
  "baby-me",
  "toys-and-sensory",
  "sweetoh-creations",
  "island-sprouts-originals",
] as const;
