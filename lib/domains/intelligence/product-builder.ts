import { generateProductDraft as generateProductDraftWithOpenAi } from "@/lib/integrations/ai/openai";
import { generateProductDraftMock } from "@/lib/integrations/ai/mock";
import { isMockAiEnabled } from "@/lib/config/env";
import type { ProductDraftInput } from "@/lib/integrations/ai/types";

/**
 * Provider swap point: change this import to point at a different
 * implementation of ProductDraftGenerator to switch AI providers.
 */
export async function generateProductDraft(input: ProductDraftInput) {
  if (isMockAiEnabled()) {
    return generateProductDraftMock(input);
  }

  return generateProductDraftWithOpenAi(input);
}
