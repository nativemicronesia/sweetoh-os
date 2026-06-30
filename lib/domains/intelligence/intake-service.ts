import { analyzeProductImageWithOpenAi } from "@/lib/integrations/ai/intake-openai";
import { analyzeProductImageMock } from "@/lib/integrations/ai/mock";
import { isMockAiEnabled } from "@/lib/config/env";
import type {
  VisualIntakeAnalyzer,
  VisualIntakeInput,
} from "@/lib/integrations/ai/intake-types";

/**
 * Product Intelligence Engine — visual intake analyzer (ADR-014, ADR-015).
 * Provider swap point; venture persona adapters call this boundary.
 */
export async function analyzeProductImage(input: VisualIntakeInput) {
  return getVisualIntakeAnalyzer()(input);
}

function getVisualIntakeAnalyzer(): VisualIntakeAnalyzer {
  if (isMockAiEnabled()) {
    return analyzeProductImageMock;
  }

  return analyzeProductImageWithOpenAi;
}
