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

const COLLECTION_HINTS: Record<string, string> = {
  "baby-me": "Baby + Me — essentials for little ones and caregivers.",
  "toys-and-sensory": "Toys & Sensory — playful, sensory-friendly picks.",
  "sweetoh-creations": "Sweet'Oh Creations — personalized gifts and apparel.",
  "island-sprouts-originals": "Island Sprouts Originals — signature designs from the brand.",
};

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
    normalized.includes("shop") ||
    normalized.includes("browse")
  ) {
    if (collections.length === 0) {
      return {
        reply:
          "Collections will appear here once products are published. Check back soon or browse all products.",
        suggestions: [{ label: "All products", href: "/collections" }],
      };
    }

    const names = collections.map((item) => item.name).join(", ");
    return {
      reply: `You can explore ${names}. Each collection groups related products for easier discovery.`,
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
      normalized.includes("create"))
  ) {
    return {
      reply:
        "Custom Sweet'Oh requests start on the Create page — describe your idea, optional reference image, and our team reviews it before anything is produced or charged.",
      suggestions: [
        { label: "Request a custom design", href: "/create" },
        { label: "Sweet'Oh Creations", href: "/collections/sweetoh-creations" },
      ],
    };
  }

  if (
    normalized.includes("sweet") ||
    normalized.includes("custom") ||
    normalized.includes("personal")
  ) {
    const sweetoh = collections.find((item) => item.slug === "sweetoh-creations");
    return {
      reply:
        "Sweet'Oh Creations are personalized items made through our studio workflow. Browse the collection for current offerings.",
      suggestions: sweetoh
        ? [{ label: "Sweet'Oh Creations", href: `/collections/${sweetoh.slug}` }]
        : [{ label: "Collections", href: "/collections" }],
    };
  }

  if (
    normalized.includes("ship") ||
    normalized.includes("delivery") ||
    normalized.includes("return")
  ) {
    return {
      reply:
        "Shipping and returns policies are on our help pages. Physical items ship after production or supplier fulfillment.",
      suggestions: [
        { label: "Shipping", href: "/shipping" },
        { label: "Returns", href: "/returns" },
      ],
    };
  }

  if (products.length === 0) {
    return {
      reply:
        "The catalog is still being set up. Ask about collections, shipping, or Sweet'Oh Creations — or check back when new products are live.",
      suggestions: [
        { label: "Collections", href: "/collections" },
        { label: "About", href: "/about" },
      ],
    };
  }

  const matches = products
    .filter((product) => {
      const haystack = `${product.name} ${product.shortDescription ?? ""} ${product.description ?? ""}`.toLowerCase();
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
    reply: `Island Sprouts has ${products.length} active product${products.length === 1 ? "" : "s"} across ${collections.length || "several"} collection${collections.length === 1 ? "" : "s"}. Try browsing a collection or one of these picks.`,
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

const STORE_STARTER_QUESTIONS = [
  "What collections can I browse?",
  "Show me Sweet'Oh Creations",
  "Where are shipping and returns?",
  "What products do you have?",
];

const SWEETOH_STARTER_QUESTIONS = [
  "How do custom requests work?",
  "Show me Sweet'Oh Creations",
  "Where are shipping and returns?",
];

/**
 * Storefront context for Olo FAB — starter prompts and live collection links.
 * Content-free framework data from the catalog read model.
 */
export async function getOloStorefrontContext(input?: {
  surface?: StorefrontSurface;
}): Promise<OloStorefrontContext> {
  const surface = input?.surface ?? "store";
  const venture = await getDefaultVenture();
  const [products, collections] = await Promise.all([
    listActiveProducts(venture.id),
    getStorefrontNavCollections(venture.id),
  ]);

  return {
    enabled: true,
    surface,
    starterQuestions:
      surface === "sweetoh" ? SWEETOH_STARTER_QUESTIONS : STORE_STARTER_QUESTIONS,
    collections: collections.map((item) => ({
      label: item.name,
      href: `/collections/${item.slug}`,
      hint: COLLECTION_HINTS[item.slug],
    })),
    productCount: products.length,
  };
}
