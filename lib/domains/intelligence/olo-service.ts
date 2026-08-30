import {
  AUTOMATIC_COLLECTIONS,
  type ProductCategory,
} from "@/lib/domains/catalog";
import {
  getStorefrontNavCollections,
  listActiveProducts,
} from "@/lib/domains/catalog/service";
import { getDefaultVenture } from "@/lib/domains/identity/service";
import type { StorefrontSurface } from "@/lib/storefront/branding";
import { ValidationError } from "@/lib/shared/errors";

export type OloGuideResponse = {
  reply: string;
  suggestions: { label: string; href: string }[];
};

export type OloStorefrontContext = {
  enabled: boolean;
  surface: StorefrontSurface;
  starterQuestions: string[];
  collections: { label: string; href: string; hint?: string }[];
  productCount: number;
};

const COLLECTION_HINTS: Record<string, string> = Object.fromEntries(
  AUTOMATIC_COLLECTIONS.map((item) => [item.slug, item.blurb]),
);

function normalizeQuestion(input: string): string {
  return input.trim().toLowerCase();
}

/**
 * Rule-based Olo guide for V1 framework. Reads live catalog context only —
 * no OpenAI, no launch copy deck. Replace/extend when Olo content ships.
 */
export async function getOloGuideResponse(
  question: string,
): Promise<OloGuideResponse> {
  const trimmed = question.trim();

  if (!trimmed) {
    throw new ValidationError("Ask Olo a question about products or collections.");
  }

  const venture = await getDefaultVenture();
  const [products, collections] = await Promise.all([
    listActiveProducts(venture.id),
    getStorefrontNavCollections(venture.id),
  ]);

  const normalized = normalizeQuestion(trimmed);

  if (
    normalized.includes("collection") ||
    normalized.includes("categor") ||
    normalized.includes("shop") ||
    normalized.includes("browse") ||
    normalized.includes("aisle")
  ) {
    if (collections.length === 0) {
      return {
        reply:
          "Categories will appear here once products are published. Check back soon or browse all products.",
        suggestions: [{ label: "All products", href: "/products" }],
      };
    }

    const names = collections.map((item) => item.name).join(", ");
    return {
      reply: `Sweet'Oh prints across ${names}. Pick a category to browse blanks and designs.`,
      suggestions: collections.map((item) => ({
        label: item.name,
        href: `/collections/${item.slug}`,
      })),
    };
  }

  if (
    normalized.includes("custom") &&
    (normalized.includes("request") ||
      normalized.includes("work") ||
      normalized.includes("submit") ||
      normalized.includes("create") ||
      normalized.includes("design"))
  ) {
    return {
      reply:
        "Custom designs start on Create — describe your idea, optional reference image, and we'll preview a mockup before anything is produced.",
      suggestions: [
        { label: "Open Studio", href: "/studio" },
        { label: "Custom aisle", href: "/collections/custom" },
      ],
    };
  }

  if (
    normalized.includes("kids") ||
    normalized.includes("baby") ||
    normalized.includes("toddler")
  ) {
    return {
      reply: "Kids gear lives in its own aisle — onesies, youth tees, and littles' prints.",
      suggestions: [
        { label: "Kids", href: "/collections/kids" },
        { label: "Open Studio", href: "/studio" },
      ],
    };
  }

  if (
    normalized.includes("ship") ||
    normalized.includes("delivery") ||
    normalized.includes("return")
  ) {
    return {
      reply:
        "Shipping and returns policies are on our help pages. Physical items ship after production.",
      suggestions: [
        { label: "Shipping", href: "/shipping" },
        { label: "Returns", href: "/returns" },
      ],
    };
  }

  if (products.length === 0) {
    return {
      reply:
        "The catalog is still being set up. Ask about categories, shipping, or creating a custom design.",
      suggestions: [
        { label: "Shop categories", href: "/collections" },
        { label: "Open Studio", href: "/studio" },
      ],
    };
  }

  const matches = products
    .filter((product) => {
      const haystack = `${product.name} ${product.shortDescription ?? ""} ${product.description ?? ""} ${(product.category as ProductCategory) ?? ""}`.toLowerCase();
      return normalized
        .split(/\s+/)
        .filter((word) => word.length > 3)
        .some((word) => haystack.includes(word));
    })
    .slice(0, 3);

  if (matches.length > 0) {
    return {
      reply: `Here ${matches.length === 1 ? "is a product" : "are a few products"} that may help:`,
      suggestions: matches.map((product) => ({
        label: product.name,
        href: `/products/${product.slug}`,
      })),
    };
  }

  const featured = products.slice(0, 3);
  const collectionSuggestions = collections.slice(0, 3).map((item) => ({
    label: item.name,
    href: `/collections/${item.slug}`,
  }));

  return {
    reply: `Sweet'Oh has ${products.length} active product${products.length === 1 ? "" : "s"} across ${collections.length} categor${collections.length === 1 ? "y" : "ies"}. Browse an aisle or one of these picks.`,
    suggestions: [
      ...featured.map((product) => ({
        label: product.name,
        href: `/products/${product.slug}`,
      })),
      ...collectionSuggestions,
    ].slice(0, 4),
  };
}

export function getOloCollectionHint(slug: string): string | undefined {
  return COLLECTION_HINTS[slug];
}

const SWEETOH_STARTER_QUESTIONS = [
  "What categories can I browse?",
  "Show me kids products",
  "How do custom designs work?",
  "Where are shipping and returns?",
];

/**
 * Storefront context for Olo FAB — starter prompts and live collection links.
 * Content-free framework data from the catalog read model.
 */
export async function getOloStorefrontContext(input?: {
  surface?: StorefrontSurface;
}): Promise<OloStorefrontContext> {
  const surface = input?.surface ?? "sweetoh";
  const venture = await getDefaultVenture();
  const [products, collections] = await Promise.all([
    listActiveProducts(venture.id),
    getStorefrontNavCollections(venture.id),
  ]);

  return {
    enabled: true,
    surface,
    starterQuestions: SWEETOH_STARTER_QUESTIONS,
    collections: collections.map((item) => ({
      label: item.name,
      href: `/collections/${item.slug}`,
      hint: COLLECTION_HINTS[item.slug],
    })),
    productCount: products.length,
  };
}
