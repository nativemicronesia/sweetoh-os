import OpenAI from "openai";

let client: OpenAI | null = null;

function resolveDekazApiKey(): string | undefined {
  const dekaz = process.env.DEKAZ_OPENAI_API_KEY?.trim();
  if (dekaz) {
    return dekaz;
  }

  return process.env.OPENAI_API_KEY?.trim() || undefined;
}

export function isDekazAiConfigured(): boolean {
  return Boolean(resolveDekazApiKey());
}

export function isDekazAiMockEnabled(): boolean {
  return (
    process.env.DEKAZ_AI_MOCK_MODE === "true" ||
    process.env.AI_MOCK_MODE === "true"
  );
}

export function getDekazOpenAiModel(): string {
  return (
    process.env.DEKAZ_OPENAI_MODEL?.trim() ||
    process.env.OPENAI_MODEL?.trim() ||
    "gpt-4o-mini"
  );
}

export function getDekazOpenAiClient(): OpenAI {
  const apiKey = resolveDekazApiKey();

  if (!apiKey) {
    throw new Error(
      "Dekaz AI is not configured. Set OPENAI_API_KEY or DEKAZ_OPENAI_API_KEY, or enable AI_MOCK_MODE / DEKAZ_AI_MOCK_MODE.",
    );
  }

  if (!client) {
    client = new OpenAI({ apiKey });
  }

  return client;
}
