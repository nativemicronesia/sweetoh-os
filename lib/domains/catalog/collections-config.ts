import type { ProductCategory } from "./publish";

export const AUTOMATIC_COLLECTIONS = [
  {
    slug: "baby-me",
    name: "Baby + Me",
    ruleKey: "baby_me" as const,
    category: "baby_me" as const,
  },
  {
    slug: "toys-and-sensory",
    name: "Toys & Sensory",
    ruleKey: "toys_sensory" as const,
    category: "toys_sensory" as const,
  },
  {
    slug: "sweetoh-creations",
    name: "Sweet'Oh Creations",
    ruleKey: "sweetoh_creations" as const,
    category: "sweetoh_creations" as const,
  },
  {
    slug: "island-sprouts-originals",
    name: "Island Sprouts Originals",
    ruleKey: "originals" as const,
    category: "originals" as const,
  },
] as const satisfies ReadonlyArray<{
  slug: string;
  name: string;
  ruleKey: ProductCategory;
  category: ProductCategory;
}>;
