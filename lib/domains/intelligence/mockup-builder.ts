import { generateProductMockup as generateProductMockupWithOpenAi } from "@/lib/integrations/ai/openai";
import { isMockAiEnabled } from "@/lib/config/env";
import { MOCK_PLACEHOLDER_PNG } from "./mock-fixtures";

/**
 * Provider swap point for mockup image generation — mirrors
 * product-builder.ts's pattern for text drafts. Mock mode returns the
 * existing 1x1 placeholder PNG already used elsewhere for E2E fixtures,
 * so /create's generation flow stays deterministic and free to test.
 */
export async function generateProductMockup(input: {
  prompt: string;
  referenceImageBuffer?: Buffer;
  referenceImageMimeType?: string;
}): Promise<Buffer | null> {
  if (isMockAiEnabled()) {
    return MOCK_PLACEHOLDER_PNG;
  }

  return generateProductMockupWithOpenAi(input);
}
