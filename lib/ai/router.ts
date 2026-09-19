/**
 * Sweet'Oh AI routing — the Dekaz pattern (see nmh-os/lib/ai/providers.ts).
 *
 * Code asks for a JOB at a LEVEL, never a model:
 *   chat     → OpenAI      (conversation, planning, running Studio tools)
 *   reason   → Anthropic   (brand strategy, pricing, judgement)
 *   research → Gemini      (niches, trends, competitors)
 *
 * All three are called through the OpenAI SDK: OpenAI natively, Anthropic and
 * Gemini through their OpenAI-compatible endpoints. That keeps one tool-calling
 * format for Skink, and it is exactly what LiteLLM speaks — set AI_BASE_URL and
 * every call goes to the proxy using the `sweetoh-<job>-<level>` aliases instead.
 *
 * A provider without a key falls back to OpenAI chat, so nothing breaks before
 * ANTHROPIC_API_KEY / GEMINI_API_KEY are wired.
 */
import OpenAI from "openai";
import type { AiLevel } from "@/lib/domains/creator/plans";

export type AiJob = "chat" | "reason" | "research";
type Provider = "openai" | "anthropic" | "gemini";

type Route = { provider: Provider; model: string; inPerM: number; outPerM: number };

/** $ per 1M tokens, checked 2026-09-20. Opus 5 / Gemini Pro are estimates — verify on the provider pricing pages. */
const ROUTES: Record<AiJob, Record<AiLevel, Route>> = {
  chat: {
    light: { provider: "openai", model: "gpt-5.6-luna", inPerM: 0.2, outPerM: 1.2 },
    smart: { provider: "openai", model: "gpt-5.6-luna", inPerM: 0.2, outPerM: 1.2 },
    deep: { provider: "openai", model: "gpt-5.6-sol", inPerM: 4, outPerM: 20 },
  },
  reason: {
    light: { provider: "openai", model: "gpt-5.6-luna", inPerM: 0.2, outPerM: 1.2 },
    smart: { provider: "anthropic", model: "claude-sonnet-5", inPerM: 2, outPerM: 10 },
    deep: { provider: "anthropic", model: "claude-opus-5", inPerM: 5, outPerM: 25 },
  },
  research: {
    light: { provider: "gemini", model: "gemini-3.7-flash", inPerM: 0.75, outPerM: 3.75 },
    smart: { provider: "gemini", model: "gemini-3.7-flash", inPerM: 0.75, outPerM: 3.75 },
    deep: { provider: "gemini", model: "gemini-3.1-pro-preview", inPerM: 2, outPerM: 12 },
  },
};

const FALLBACK: Route = ROUTES.chat.light;

function env(name: string) {
  return process.env[name]?.trim() || undefined;
}

function providerKey(provider: Provider) {
  if (provider === "openai") return env("OPENAI_API_KEY");
  if (provider === "anthropic") return env("ANTHROPIC_API_KEY");
  return env("GEMINI_API_KEY") ?? env("GOOGLE_GENERATIVE_AI_API_KEY");
}

const BASE_URLS: Record<Provider, string | undefined> = {
  openai: undefined,
  anthropic: "https://api.anthropic.com/v1/",
  gemini: "https://generativelanguage.googleapis.com/v1beta/openai/",
};

const clients = new Map<string, OpenAI>();
function client(baseURL: string | undefined, apiKey: string) {
  const id = `${baseURL ?? "openai"}:${apiKey.slice(-6)}`;
  let c = clients.get(id);
  if (!c) {
    c = new OpenAI({ apiKey, baseURL, maxRetries: 1, timeout: 90_000 });
    clients.set(id, c);
  }
  return c;
}

export type ResolvedModel = {
  client: OpenAI;
  model: string;
  route: Route;
  /** What was asked for, for logging. */
  job: AiJob;
  level: AiLevel;
};

export function isAiConfigured() {
  return Boolean(env("AI_BASE_URL") || providerKey("openai"));
}

/** Pick the client + model for a job at a level. */
export function resolveModel(job: AiJob, level: AiLevel): ResolvedModel {
  const route = ROUTES[job][level];
  const proxy = env("AI_BASE_URL");
  if (proxy) {
    const key = env("LITELLM_API_KEY") ?? "sk-sweetoh-local";
    return { client: client(proxy, key), model: `sweetoh-${job}-${level}`, route, job, level };
  }
  const key = providerKey(route.provider);
  if (key) return { client: client(BASE_URLS[route.provider], key), model: route.model, route, job, level };
  const fallbackKey = providerKey("openai");
  if (!fallbackKey) throw new Error("No AI provider is configured (OPENAI_API_KEY).");
  return { client: client(undefined, fallbackKey), model: FALLBACK.model, route: FALLBACK, job, level };
}

/** Raw provider cost → credits (1 credit ≈ $0.01). */
export function creditsForUsage(route: Route, usage: { prompt_tokens?: number; completion_tokens?: number } | undefined | null) {
  if (!usage) return 0.05;
  const dollars = ((usage.prompt_tokens ?? 0) * route.inPerM + (usage.completion_tokens ?? 0) * route.outPerM) / 1_000_000;
  return Math.max(0.01, Math.round(dollars * 100 * 1000) / 1000);
}

/** Image models: Flare for everyday generation, Sunburst for premium (Pro). */
export function imageModel(premium = false) {
  return premium
    ? env("PRODUCT_IMAGE_MODEL_PREMIUM") ?? "gpt-image-2.5-sunburst"
    : env("PRODUCT_IMAGE_MODEL") ?? "gpt-image-2.5-flare";
}

/** For a LiteLLM config: the alias → provider model table. */
export function litellmAliases() {
  return (Object.keys(ROUTES) as AiJob[]).flatMap((job) =>
    (Object.keys(ROUTES[job]) as AiLevel[]).map((level) => ({
      alias: `sweetoh-${job}-${level}`,
      model: `${ROUTES[job][level].provider}/${ROUTES[job][level].model}`,
    })),
  );
}
