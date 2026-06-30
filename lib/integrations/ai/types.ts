import type { ProductCategory } from "@/lib/domains/catalog/publish";

export type ProductDraftInput = {
  prompt: string;
};

export type ProductDraftOutput = {
  title: string;
  description: string;
  shortDescription: string;
  seoTitle: string;
  seoDescription: string;
  category: ProductCategory;
  suggestedTags: string[];
  suggestedCollections: string[];
  suggestedPriceCents: number;
  internalNotes: string;
};

export type ProductDraftGenerator = (
  input: ProductDraftInput,
) => Promise<{ output: ProductDraftOutput; rawResponse: unknown }>;
