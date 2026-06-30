import OpenAI from "openai";
import { z } from "zod";
import { getServerEnv, isOpenAiConfigured } from "@/lib/config/env";
import { ValidationError } from "@/lib/shared/errors";
import type { ProductDraftGenerator } from "./types";

const CATEGORY_VALUES = [
  "baby_me",
  "toys_sensory",
  "sweetoh_creations",
  "originals",
] as const;

const productDraftSchema = z.object({
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
  internalNotes: z.string().default(""),
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

const SYSTEM_PROMPT = `You are the product drafting assistant for Island Sprouts, a children's brand. Operators most often describe Sweet'Oh Creations items — custom apparel and personalized gifts (t-shirts, mugs, tumblers, tote bags) — but also Baby + Me, Toys & Sensory, and Island Sprouts Originals products.

Given a short operator description, produce a JSON object with exactly these fields:
- title: a clear, customer-facing product title
- description: a 2-4 sentence product description
- shortDescription: a one-sentence summary for listings
- seoTitle: an SEO-friendly title, under 60 characters
- seoDescription: an SEO meta description, under 160 characters
- category: exactly one of "baby_me", "toys_sensory", "sweetoh_creations", "originals"
- suggestedTags: an array of 3-8 lowercase keyword strings
- suggestedCollections: an array of 1-3 free-text collection name suggestions
- suggestedPriceCents: recommended retail price in USD cents (integer, e.g. 1999 for $19.99). Use realistic Island Sprouts / Sweet'Oh pricing for the product type.
- internalNotes: brief production/operator notes (materials, sizing, mascot usage, pricing rationale), not shown to customers

Respond with JSON only, no other text.`;

export const generateProductDraft: ProductDraftGenerator = async (input) => {
  const openai = getOpenAiClient();
  const { openaiModel } = getServerEnv();

  const completion = await openai.chat.completions.create({
    model: openaiModel,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: input.prompt },
    ],
  });

  const content = completion.choices[0]?.message?.content;

  if (!content) {
    throw new ValidationError("AI provider returned an empty response.");
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(content);
  } catch {
    throw new ValidationError("AI provider returned invalid JSON.");
  }

  const parsed = productDraftSchema.safeParse(parsedJson);

  if (!parsed.success) {
    throw new ValidationError(
      `AI provider response did not match the expected shape: ${parsed.error.message}`,
    );
  }

  return { output: parsed.data, rawResponse: parsedJson };
};
