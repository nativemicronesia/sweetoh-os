import type { ProductCategory } from "@/lib/domains/catalog/publish";
import type { ProductDraftOutput } from "./types";

export type VisualIntakeDetection = {
  productType?: string;
  colors?: string[];
  materials?: string[];
  dimensions?: string;
  variants?: string[];
};

export type VisualIntakeInput = {
  imageBase64: string;
  mimeType: string;
  operatorNotes?: string;
  inputMode?: "image_only" | "image_and_prompt";
};

export type VisualIntakeOutput = ProductDraftOutput & {
  confidenceScore: number;
  detection: VisualIntakeDetection;
};

export type VisualIntakeAnalyzer = (
  input: VisualIntakeInput,
) => Promise<{ output: VisualIntakeOutput; rawResponse: unknown }>;

export const VISUAL_INTAKE_CATEGORIES: ProductCategory[] = [
  "apparel",
  "kids",
  "home",
  "drinkware",
  "accessories",
  "custom",
];
