/**
 * Studio chat model provider — env-driven base-URL swap.
 *
 * Deliberately mirrors nmh-os's `lib/ai/providers.ts`: when `AI_BASE_URL` is
 * set (local LiteLLM proxy, or one day a real shared Dekaz endpoint) the
 * OpenAI SDK is pointed at it; when unset the SDK falls back to its own
 * default host (api.openai.com) using this app's existing `OPENAI_API_KEY`.
 * Repointing this chat at a shared Dekaz service later is therefore a config
 * change, not a rewrite.
 *
 * This is Sweet'Oh's own chat today — it makes no call to nmh-os.
 */

import OpenAI from "openai";
import { getServerEnv, isOpenAiConfigured } from "@/lib/config/env";

/** Only set when a proxy/gateway is actually intended. */
function baseUrl(): string | undefined {
  return process.env.AI_BASE_URL?.trim() || undefined;
}

/**
 * Proxy key first (LiteLLM validates it against LITELLM_MASTER_KEY), then the
 * app's own OpenAI key for the direct path.
 */
function apiKey(): string | undefined {
  return (
    process.env.STUDIO_CHAT_API_KEY?.trim() ||
    process.env.LITELLM_API_KEY?.trim() ||
    getServerEnv().openaiApiKey
  );
}

/** True when the chat has a reachable model endpoint configured. */
export function isStudioChatConfigured(): boolean {
  return Boolean(process.env.LITELLM_API_KEY?.trim()) || isOpenAiConfigured();
}

/** Model id — overridable without a code change, defaults to the app model. */
export function studioChatModel(): string {
  return process.env.STUDIO_CHAT_MODEL?.trim() || getServerEnv().openaiModel;
}

export function getStudioChatClient(): OpenAI {
  return new OpenAI({
    apiKey: apiKey() ?? "sk-local-sweetoh",
    baseURL: baseUrl(),
  });
}

export function logStudioChatFailure(fn: string, error: unknown): void {
  console.error(
    `[studio-chat] ${fn} failed:`,
    error instanceof Error ? error.message : error,
  );
}
