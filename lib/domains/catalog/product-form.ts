import { parseDelimitedList } from "@/lib/shared/format";
import { ValidationError } from "@/lib/shared/errors";
import { PRODUCT_CATEGORIES, type ProductCategory } from "./categories";

const CATEGORIES: ProductCategory[] = [...PRODUCT_CATEGORIES];

export type ParsedProductFormFields = {
  slug: string;
  name: string;
  description: string | null;
  priceCents: number;
  category: ProductCategory;
  fulfillmentType: string;
  supplierSku: string | null;
  sourceAssetId: string | null;
  shortDescription: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  internalNotes: string | null;
  suggestedTags: string[] | null;
  suggestedCollections: string[] | null;
};

export type ParsedPartnerProductFormFields = {
  name: string;
  description: string | null;
  priceCents: number;
  category: ProductCategory;
  shortDescription: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  suggestedTags: string[] | null;
  suggestedCollections: string[] | null;
};

export function parsePartnerProductFields(
  formData: FormData,
): ParsedPartnerProductFormFields {
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const dollars = formData.get("priceDollars");
  if (dollars !== null && !/^\d+(?:\.\d{1,2})?$/.test(String(dollars).trim())) {
    throw new ValidationError("Enter a price in dollars, with up to two decimal places.");
  }
  const priceCents = dollars === null ? Number(formData.get("priceCents") ?? 0) : Math.round(Number(dollars) * 100);
  const category = String(formData.get("category") ?? "") as ProductCategory;
  const shortDescription =
    String(formData.get("shortDescription") ?? "").trim() || null;
  const seoTitle = String(formData.get("seoTitle") ?? "").trim() || null;
  const seoDescription =
    String(formData.get("seoDescription") ?? "").trim() || null;
  const suggestedTags = parseDelimitedList(
    String(formData.get("suggestedTags") ?? ""),
  );
  const suggestedCollections = parseDelimitedList(
    String(formData.get("suggestedCollections") ?? ""),
  );

  return {
    name,
    description,
    priceCents,
    category,
    shortDescription,
    seoTitle,
    seoDescription,
    suggestedTags: suggestedTags.length > 0 ? suggestedTags : null,
    suggestedCollections:
      suggestedCollections.length > 0 ? suggestedCollections : null,
  };
}

export function validatePartnerProductFields(
  fields: ParsedPartnerProductFormFields,
) {
  if (!fields.name) {
    throw new ValidationError("Name is required.");
  }

  if (!CATEGORIES.includes(fields.category)) {
    throw new ValidationError("Invalid category.");
  }

  if (!Number.isSafeInteger(fields.priceCents) || fields.priceCents < 0 || fields.priceCents > 2147483647) {
    throw new ValidationError(
      "Price must be a non-negative number of cents.",
    );
  }
}
