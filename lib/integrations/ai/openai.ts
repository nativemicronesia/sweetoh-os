import OpenAI from "openai";
import { z } from "zod";
import { getServerEnv, isOpenAiConfigured } from "@/lib/config/env";
import { ValidationError } from "@/lib/shared/errors";
import type { ProductDraftGenerator } from "./types";

const CATEGORY_VALUES = [
  "apparel",
  "kids",
  "home",
  "drinkware",
  "accessories",
  "custom",
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

const SYSTEM_PROMPT = `You are the product drafting assistant for Sweet'Oh Creations, an independent Micronesian-owned creative print shop in Lacey, Washington serving all ages. Draft descriptions for the actual product and intended audience; do not assume children's products or Island Sprouts branding. Do not invent exact brands, model numbers, materials, dimensions, certifications, or available options. Mark unverified specifications in internalNotes for the partner to check.

Given a short operator description, produce a JSON object with exactly these fields:
- title: a clear, customer-facing product title
- description: a 2-4 sentence product description
- shortDescription: a one-sentence summary for listings
- seoTitle: an SEO-friendly title, under 60 characters
- seoDescription: an SEO meta description, under 160 characters
- category: exactly one of "apparel", "kids", "home", "drinkware", "accessories", "custom" (printable product family)
- suggestedTags: an array of 3-8 lowercase keyword strings
- suggestedCollections: an array of 1-3 free-text collection name suggestions
- suggestedPriceCents: recommended retail price in USD cents (integer, e.g. 1999 for $19.99). Any price is only a draft suggestion; the partner chooses the selling price.
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

// ── Customer-facing mascot Q&A ──────────────────────────────────────────────

const MASCOT_SYSTEM_PROMPT = `You are Sweet'Oh AI, represented by a green tree skink (Lamprolepis smaragdina), the friendly mascot assistant on Sweet'Oh Creations' storefront — a print-on-demand shop selling custom apparel and personalized gifts (t-shirts, mugs, tumblers, tote bags). Answer customer questions about products, shipping, and general help, warmly and briefly.

Never fabricate order-specific details (order status, tracking, delivery dates) — you have no access to real order data. If asked about a specific order, tell the customer to contact support instead of guessing.`;

/**
 * Unlike generateProductDraft above (which throws on failure, for the
 * partner-facing draft form to surface as a real error), this returns null
 * on any failure or misconfiguration — the mascot widget shows a plain
 * "unavailable" state rather than crashing a customer-facing page.
 */
export async function answerCustomerQuestion(input: {
  message: string;
  history: { role: "user" | "assistant"; content: string }[];
}): Promise<string | null> {
  if (!isOpenAiConfigured()) return null;

  try {
    const openai = getOpenAiClient();
    const { openaiModel } = getServerEnv();

    const completion = await openai.chat.completions.create({
      model: openaiModel,
      messages: [
        { role: "system", content: MASCOT_SYSTEM_PROMPT },
        ...input.history.map((turn) => ({ role: turn.role, content: turn.content })),
        { role: "user", content: input.message },
      ],
    });

    return completion.choices[0]?.message?.content?.trim() || null;
  } catch {
    return null;
  }
}

// ── Customer-generated design (mockup image + voice prompt) ────────────────

const IMAGE_MODEL = "gpt-image-1";
const TRANSCRIPTION_MODEL = "whisper-1";

/**
 * Generates a product mockup preview from a text prompt, optionally guided
 * by blank + design reference images. Prefer editing the blank (and design
 * when the API accepts multi-image). Returns null on failure.
 */
export async function generateProductMockup(input: {
  prompt: string;
  referenceImageBuffer?: Buffer;
  referenceImageMimeType?: string;
  blankImageBuffer?: Buffer;
  blankImageMimeType?: string;
}): Promise<Buffer | null> {
  if (!isOpenAiConfigured()) return null;

  try {
    const openai = getOpenAiClient();

    const files: Awaited<ReturnType<typeof OpenAI.toFile>>[] = [];

    if (input.blankImageBuffer) {
      files.push(
        await OpenAI.toFile(
          input.blankImageBuffer,
          `blank.${(input.blankImageMimeType ?? "image/png").split("/")[1] ?? "png"}`,
          { type: input.blankImageMimeType ?? "image/png" },
        ),
      );
    }

    if (input.referenceImageBuffer) {
      files.push(
        await OpenAI.toFile(
          input.referenceImageBuffer,
          `design.${(input.referenceImageMimeType ?? "image/png").split("/")[1] ?? "png"}`,
          { type: input.referenceImageMimeType ?? "image/png" },
        ),
      );
    }

    if (files.length > 0) {
      const result = await openai.images.edit({
        model: IMAGE_MODEL,
        image: files.length === 1 ? files[0]! : files,
        prompt: input.prompt,
      });
      const b64 = result.data?.[0]?.b64_json;
      return b64 ? Buffer.from(b64, "base64") : null;
    }

    const result = await openai.images.generate({
      model: IMAGE_MODEL,
      prompt: input.prompt,
    });
    const b64 = result.data?.[0]?.b64_json;
    return b64 ? Buffer.from(b64, "base64") : null;
  } catch {
    return null;
  }
}

/** Returns null on any failure or misconfiguration — the /create UI falls
 * back to letting the customer type instead of speak. */
export async function transcribeVoicePrompt(input: {
  audioBuffer: Buffer;
  mimeType: string;
}): Promise<string | null> {
  if (!isOpenAiConfigured()) return null;

  try {
    const openai = getOpenAiClient();
    const extension = input.mimeType.split("/")[1]?.split(";")[0] ?? "webm";
    const file = await OpenAI.toFile(input.audioBuffer, `voice-note.${extension}`, {
      type: input.mimeType,
    });

    const transcription = await openai.audio.transcriptions.create({
      model: TRANSCRIPTION_MODEL,
      file,
    });

    return transcription.text?.trim() || null;
  } catch {
    return null;
  }
}
