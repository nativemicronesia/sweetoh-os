import { generateProductMockup as generateProductMockupWithOpenAi } from "@/lib/integrations/ai/openai";
import { isMockAiEnabled } from "@/lib/config/env";
import { MOCK_PLACEHOLDER_PNG } from "./mock-fixtures";
import { compositeDesignOnBlank } from "./mockup-composite";

/**
 * Provider swap point for mockup image generation — mirrors
 * product-builder.ts's pattern for text drafts. Mock mode returns the
 * existing 1x1 placeholder PNG already used elsewhere for E2E fixtures,
 * so /studio's generation flow stays deterministic and free to test.
 *
 * Prefer: AI edit when available; otherwise sharp composite of blank+design.
 */
export async function generateProductMockup(input: {
  prompt: string;
  referenceImageBuffer?: Buffer;
  referenceImageMimeType?: string;
  blankImageBuffer?: Buffer;
  blankImageMimeType?: string;
}): Promise<Buffer | null> {
  if (isMockAiEnabled()) {
    if (input.blankImageBuffer && input.referenceImageBuffer) {
      return compositeDesignOnBlank({
        blankBuffer: input.blankImageBuffer,
        designBuffer: input.referenceImageBuffer,
      });
    }
    return MOCK_PLACEHOLDER_PNG;
  }

  const ai = await generateProductMockupWithOpenAi(input);
  if (ai) return ai;

  if (input.blankImageBuffer && input.referenceImageBuffer) {
    try {
      return await compositeDesignOnBlank({
        blankBuffer: input.blankImageBuffer,
        designBuffer: input.referenceImageBuffer,
      });
    } catch {
      return null;
    }
  }

  return null;
}

/** Place artwork on a blank without calling the image model. */
export async function composeBlankMockup(input: {
  blankImageBuffer: Buffer;
  designBuffer: Buffer;
}): Promise<Buffer> {
  return compositeDesignOnBlank({
    blankBuffer: input.blankImageBuffer,
    designBuffer: input.designBuffer,
  });
}
