/**
 * Storefront / catalog product categories for Sweet'Oh as a generic POD shop.
 * Micronesian-branded merchandising; types are printable blank families.
 */
export const PRODUCT_CATEGORIES = [
  "apparel",
  "kids",
  "home",
  "drinkware",
  "accessories",
  "custom",
] as const;

export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

export type ProductCategoryMeta = {
  value: ProductCategory;
  /** URL / automatic collection slug */
  slug: string;
  label: string;
  /** Short aisle description for the storefront */
  blurb: string;
};

export const PRODUCT_CATEGORY_META: readonly ProductCategoryMeta[] = [
  {
    value: "apparel",
    slug: "apparel",
    label: "Apparel",
    blurb: "Tees, hoodies, and wearables — printed on demand.",
  },
  {
    value: "kids",
    slug: "kids",
    label: "Kids",
    blurb: "Onesies, youth tees, and littles' gear.",
  },
  {
    value: "home",
    slug: "home",
    label: "Home",
    blurb: "Blankets, pillows, wall prints, and soft goods.",
  },
  {
    value: "drinkware",
    slug: "drinkware",
    label: "Drinkware",
    blurb: "Mugs, tumblers, and everyday cups.",
  },
  {
    value: "accessories",
    slug: "accessories",
    label: "Accessories",
    blurb: "Totes, hats, stickers, and small carries.",
  },
  {
    value: "custom",
    slug: "custom",
    label: "Custom",
    blurb: "One-of-a-kind and special-order prints.",
  },
] as const;

export function isProductCategory(value: string): value is ProductCategory {
  return (PRODUCT_CATEGORIES as readonly string[]).includes(value);
}

export function getCategoryMeta(category: ProductCategory): ProductCategoryMeta {
  const meta = PRODUCT_CATEGORY_META.find((item) => item.value === category);
  if (!meta) {
    throw new Error(`Unknown product category: ${category}`);
  }
  return meta;
}

export function categoryLabel(category: ProductCategory): string {
  return getCategoryMeta(category).label;
}

/** Map legacy Island Sprouts–era categories onto the POD taxonomy. */
export function mapLegacyProductCategory(value: string): ProductCategory {
  switch (value) {
    case "baby_me":
    case "toys_sensory":
    case "kids":
      return "kids";
    case "apparel":
      return "apparel";
    case "home":
      return "home";
    case "drinkware":
      return "drinkware";
    case "accessories":
      return "accessories";
    case "sweetoh_creations":
    case "originals":
    case "custom":
      return "custom";
    default:
      return "custom";
  }
}
