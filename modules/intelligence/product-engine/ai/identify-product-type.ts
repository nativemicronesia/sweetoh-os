import { z } from "zod";
import {
  getDekazOpenAiClient,
  getDekazOpenAiModel,
  isDekazAiMockEnabled,
} from "./client";
import type { ProductTypeIdentification } from "../types";

const identificationSchema = z.object({
  productType: z.string().min(1),
  confidence: z.number().min(0).max(100),
});

const SYSTEM_PROMPT = `You identify the general type of physical product shown in a photo (e.g. "mug", "t-shirt", "tote bag", "tumbler", "sticker", "poster"). Respond with JSON only: { "productType": string, "confidence": number (0-100) }. productType should be a short, lowercase, generic noun phrase -- never a brand name, a specific design, or a venture name.`;

export async function identifyProductType(input: {
  imageBase64: string;
  mimeType: string;
}): Promise<ProductTypeIdentification> {
  if (isDekazAiMockEnabled()) {
    return { productType: "mug", confidence: 50 };
  }

  const client = getDekazOpenAiClient();
  const dataUrl = `data:${input.mimeType};base64,${input.imageBase64}`;

  const completion = await client.chat.completions.create({
    model: getDekazOpenAiModel(),
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: [
          { type: "text", text: "Identify the product type in this photo." },
          { type: "image_url", image_url: { url: dataUrl } },
        ],
      },
    ],
  });

  const content = completion.choices[0]?.message?.content;

  if (!content) {
    throw new Error("Product type identification returned an empty response.");
  }

  const parsed = identificationSchema.safeParse(JSON.parse(content));

  if (!parsed.success) {
    throw new Error(
      `Product type identification response did not match the expected shape: ${parsed.error.message}`,
    );
  }

  return parsed.data;
}
