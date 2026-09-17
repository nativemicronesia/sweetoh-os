import OpenAI from "openai";
import { z } from "zod";
import { getServerEnv, isOpenAiConfigured } from "@/lib/config/env";
import { ValidationError } from "@/lib/shared/errors";
import type { VisualIntakeAnalyzer } from "./intake-types";

const CATEGORY_VALUES = [
  "apparel",
  "kids",
  "home",
  "drinkware",
  "accessories",
  "custom",
] as const;

function coerceOptionalString(value: unknown): string | undefined {
  if (value == null) return undefined;
  if (typeof value === "string") return value;
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function coerceStringArray(value: unknown): string[] | undefined {
  if (value == null) return undefined;
  if (Array.isArray(value)) {
    return value.map((item) => (typeof item === "string" ? item : String(item)));
  }
  if (typeof value === "string") return [value];
  return undefined;
}

const visualIntakeSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  shortDescription: z.string().min(1),
  seoTitle: z.string().min(1),
  seoDescription: z.string().min(1),
  category: z.enum(CATEGORY_VALUES),
  suggestedTags: z.array(z.string()).default([]),
  suggestedCollections: z.array(z.string()).default([]),
  suggestedPriceCents: z.preprocess(
    (value) => {
      if (typeof value !== "number" || !Number.isFinite(value)) {
        return 0;
      }

      return Math.max(0, Math.round(value));
    },
    z.number().int().min(0),
  ),
  internalNotes: z.preprocess(
    (value) => {
      if (value == null) return "";
      if (typeof value === "string") return value;
      if (typeof value === "object") return JSON.stringify(value);
      return String(value);
    },
    z.string(),
  ),
  confidenceScore: z.number().min(0).max(100),
  detection: z.preprocess(
    (value) => (value && typeof value === "object" ? value : {}),
    z.object({
      productType: z.preprocess(coerceOptionalString, z.string().optional()),
      colors: z.preprocess(coerceStringArray, z.array(z.string()).optional()),
      materials: z.preprocess(coerceStringArray, z.array(z.string()).optional()),
      dimensions: z.preprocess(coerceOptionalString, z.string().optional()),
      variants: z.preprocess(coerceStringArray, z.array(z.string()).optional()),
    }),
  ),
});

let client: OpenAI | null = null;

function getOpenAiClient(): OpenAI {
  if (!isOpenAiConfigured()) {
    throw new ValidationError(
      "OpenAI is not configured. Add OPENAI_API_KEY to .env.local.",
    );
  }

  if (!client) {
    client = new OpenAI({ apiKey: getServerEnv().openaiApiKey! });
  }

  return client;
}

const SYSTEM_PROMPT = `You are the visual intake assistant for Sweet'Oh Creations, an independent Micronesian-owned print shop in Lacey, Washington serving all ages.

Analyze a photograph of a physical product (apparel, print, accessory, blank, etc.) and return JSON with:
- title, description, shortDescription, seoTitle, seoDescription
- category: one of "apparel", "kids", "home", "drinkware", "accessories", "custom" (prefer apparel/kids/home/drinkware/accessories when clear; use custom for one-offs)
- suggestedTags: 3-8 lowercase keywords
- suggestedCollections: 1-3 collection name suggestions
- suggestedPriceCents: recommended retail price in USD cents (integer, e.g. 2499 for $24.99)
- internalNotes: production notes (materials, sizing, personalization, pricing rationale) for operators
- confidenceScore: 0-100 how confident you are in the overall draft
- detection: { productType, colors[], materials[], dimensions, variants[] }

Be specific, not generic, about what the item actually is:
- productType and materials should name the real construction where visible — e.g. "Pro Club heavyweight tee" rather than "shirt", "sherpa-lined fleece blanket" rather than "blanket". Look at tags, weave/knit texture, stitching, weight, and any visible labels to judge this instead of guessing a default.
- If a blank/base product brand is recognizable from a visible tag, label, or well-known silhouette, name it. If it isn't clearly identifiable from the photo, say so plainly in internalNotes (e.g. "blank brand not visible — verify before publishing") rather than inventing one. A wrong specific detail is worse than an honest "not sure".
- Reflect the concrete detail in the customer-facing title/description too, not just internalNotes — a buyer deciding between listings cares whether it's heavyweight cotton or a thin blend.

Respond with JSON only. This creates a DRAFT for human review — be practical, not promotional.`;

export const analyzeProductImageWithOpenAi: VisualIntakeAnalyzer = async (input) => {
  const openai = getOpenAiClient();
  const { openaiModel } = getServerEnv();
  const dataUrl = `data:${input.mimeType};base64,${input.imageBase64}`;

  const userText =
    input.inputMode === "image_and_prompt" && input.operatorNotes?.trim()
      ? `Operator context (use this with the photo):\n${input.operatorNotes.trim()}\n\nAnalyze the photo and return a complete catalog draft JSON.`
      : input.operatorNotes?.trim()
        ? `${input.operatorNotes.trim()}\n\nAnalyze the photo and return a complete catalog draft JSON.`
        : "Analyze this product photo and return a complete catalog draft JSON.";

  const completion = await openai.chat.completions.create({
    model: openaiModel,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: [
          { type: "text", text: userText },
          { type: "image_url", image_url: { url: dataUrl } },
        ],
      },
    ],
  });

  const content = completion.choices[0]?.message?.content;

  if (!content) {
    throw new ValidationError("Vision provider returned an empty response.");
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(content);
  } catch {
    throw new ValidationError("Vision provider returned invalid JSON.");
  }

  const parsed = visualIntakeSchema.safeParse(parsedJson);

  if (!parsed.success) {
    throw new ValidationError(
      `Vision provider response did not match the expected shape: ${parsed.error.message}`,
    );
  }

  const { confidenceScore, detection, ...draft } = parsed.data;

  return {
    output: {
      ...draft,
      confidenceScore,
      detection,
    },
    rawResponse: parsedJson,
  };
};
