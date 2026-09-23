/**
 * Dekaz AI routing — the one way NMH ventures call a model.
 *
 * This file is kept identical in nmh-os and sweetoh-os (lib/ai/router.ts).
 * Change it in one, copy it to the other.
 *
 * Code asks for a JOB at a LEVEL, never a model:
 *   chat     (conversation, planning, fast classify, tools)
 *   reason   (strategy, synthesis, judgement)
 *   research (niches, trends, long reading)
 *
 * OpenAI is the main model for every job (owner's call, 2026-09-23). Claude is
 * only reached by an explicit pin (resolvePinnedModel, e.g. a mission packet's
 * target_model). Gemini is not used.
 *
 * Everything is called through the OpenAI SDK (Anthropic via its
 * OpenAI-compatible endpoint when pinned). One tool-calling format
 * everywhere, and exactly what LiteLLM speaks — set AI_BASE_URL and every call
 * goes to the proxy using the `dekaz-<job>-<level>` aliases instead (see
 * litellmAliases()).
 *
 * For now Dekaz runs on cloud providers only. Local models join
 * later as another provider here (behind the same aliases), not as new call
 * sites.
 *
 * A provider without a key falls back to OpenAI chat, and runWithFallback()
 * retries a failed Claude/Gemini call on OpenAI, so an unfunded account or an
 * outage degrades instead of breaking.
 */
import OpenAI from "openai";

export type AiJob = "chat" | "reason" | "research";
export type AiLevel = "light" | "smart" | "deep";
export type AiProvider = "openai" | "anthropic" | "gemini";

export type Route = { provider: AiProvider; model: string; inPerM: number; outPerM: number };

/** $ per 1M tokens, checked 2026-09-20. Opus 5 / Gemini Pro are estimates — verify on the provider pricing pages. */
export const ROUTES: Record<AiJob, Record<AiLevel, Route>> = {
  chat: {
    light: { provider: "openai", model: "gpt-5.6-luna", inPerM: 0.2, outPerM: 1.2 },
    smart: { provider: "openai", model: "gpt-5.6-luna", inPerM: 0.2, outPerM: 1.2 },
    deep: { provider: "openai", model: "gpt-5.6-sol", inPerM: 4, outPerM: 20 },
  },
  reason: {
    light: { provider: "openai", model: "gpt-5.6-luna", inPerM: 0.2, outPerM: 1.2 },
    smart: { provider: "openai", model: "gpt-5.6-luna", inPerM: 0.2, outPerM: 1.2 },
    deep: { provider: "openai", model: "gpt-5.6-sol", inPerM: 4, outPerM: 20 },
  },
  research: {
    light: { provider: "openai", model: "gpt-5.6-luna", inPerM: 0.2, outPerM: 1.2 },
    smart: { provider: "openai", model: "gpt-5.6-luna", inPerM: 0.2, outPerM: 1.2 },
    deep: { provider: "openai", model: "gpt-5.6-sol", inPerM: 4, outPerM: 20 },
  },
};

const FALLBACK: Route = ROUTES.chat.light;

function env(name: string) {
  return process.env[name]?.trim() || undefined;
}

function providerKey(provider: AiProvider) {
  if (provider === "openai") return env("OPENAI_API_KEY");
  if (provider === "anthropic") return env("ANTHROPIC_API_KEY");
  return env("GEMINI_API_KEY") ?? env("GOOGLE_GENERATIVE_AI_API_KEY");
}

const BASE_URLS: Record<AiProvider, string | undefined> = {
  openai: undefined,
  anthropic: "https://api.anthropic.com/v1/",
  gemini: "https://generativelanguage.googleapis.com/v1beta/openai/",
};

const clients = new Map<string, OpenAI>();
function client(baseURL: string | undefined, apiKey: string) {
  const id = `${baseURL ?? "openai"}:${apiKey.slice(-6)}`;
  let c = clients.get(id);
  if (!c) {
    c = new OpenAI({ apiKey, baseURL, maxRetries: 2, timeout: 90_000 });
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

export function isProviderConfigured(provider: AiProvider) {
  return Boolean(env("AI_BASE_URL") || providerKey(provider));
}

export function isAiConfigured() {
  return isProviderConfigured("openai");
}

function viaProxy(job: AiJob, level: AiLevel, route: Route, model: string): ResolvedModel | null {
  const proxy = env("AI_BASE_URL");
  if (!proxy) return null;
  const key = env("LITELLM_API_KEY") ?? "sk-dekaz-local";
  return { client: client(proxy, key), model, route, job, level };
}

function direct(job: AiJob, level: AiLevel, route: Route): ResolvedModel {
  const key = providerKey(route.provider);
  if (key) return { client: client(BASE_URLS[route.provider], key), model: route.model, route, job, level };
  const fallbackKey = providerKey("openai");
  if (!fallbackKey) throw new Error("No AI provider is configured (OPENAI_API_KEY).");
  return { client: client(undefined, fallbackKey), model: FALLBACK.model, route: FALLBACK, job, level };
}

/** Pick the client + model for a job at a level. */
export function resolveModel(job: AiJob, level: AiLevel): ResolvedModel {
  const route = ROUTES[job][level];
  return viaProxy(job, level, route, `dekaz-${job}-${level}`) ?? direct(job, level, route);
}

/** The model a job/level runs on today, for labels and logs. */
export function routeModel(job: AiJob, level: AiLevel) {
  return ROUTES[job][level].model;
}

function providerOfModel(modelId: string): AiProvider {
  if (/claude/i.test(modelId)) return "anthropic";
  if (/gemini/i.test(modelId)) return "gemini";
  return "openai";
}

/**
 * An explicit model pin (a mission packet's target_model, an animal summon).
 * Same clients and fallback rules as resolveModel; pricing comes from the
 * route table when the model is in it, else from the job/level it stands in for.
 */
export function resolvePinnedModel(modelId: string, job: AiJob = "chat", level: AiLevel = "smart"): ResolvedModel {
  const known = (Object.values(ROUTES) as Record<AiLevel, Route>[])
    .flatMap((levels) => Object.values(levels))
    .find((r) => r.model === modelId);
  const route: Route = known ?? { ...ROUTES[job][level], provider: providerOfModel(modelId), model: modelId };
  return viaProxy(job, level, route, modelId) ?? direct(job, level, route);
}

/** Gemini 3 counts its hidden thinking against max_tokens, even at low effort (checked 2026-09-23). */
const GEMINI_THINKING_HEADROOM = 2048;

/** OpenAI's newer models only take max_completion_tokens; everything else (and LiteLLM) takes max_tokens. */
export function tokenLimit(resolved: ResolvedModel, n: number) {
  if (resolved.route.provider === "gemini") return { max_tokens: n + GEMINI_THINKING_HEADROOM };
  return resolved.route.provider === "openai" && !env("AI_BASE_URL") ? { max_completion_tokens: n } : { max_tokens: n };
}

/** Provider-specific knobs: Gemini 3 thinks by default and can spend the whole budget before answering. */
export function jobParams(resolved: ResolvedModel) {
  return resolved.route.provider === "gemini" && resolved.level !== "deep" ? { reasoning_effort: "low" as const } : {};
}

/** gpt-5.6 models only accept function tools on chat completions with reasoning off. */
export function toolParams(resolved: ResolvedModel, withTools: boolean) {
  return withTools && resolved.route.provider === "openai" && resolved.route.model.startsWith("gpt-5")
    ? { reasoning_effort: "none" as const }
    : {};
}

/**
 * Run a call on the resolved model; if a Claude/Gemini call throws or comes
 * back empty (unfunded account, outage), run it once more on chat/light.
 */
export async function runWithFallback<T>(
  resolved: ResolvedModel,
  call: (resolved: ResolvedModel) => Promise<T>,
  isEmpty: (result: T) => boolean = (result) => !result,
): Promise<T> {
  try {
    const result = await call(resolved);
    if (!isEmpty(result) || resolved.route.provider === "openai") return result;
  } catch (error) {
    console.error("[dekaz] provider failed, falling back to chat/light", {
      job: resolved.job,
      level: resolved.level,
      provider: resolved.route.provider,
      model: resolved.model,
      status: (error as { status?: number })?.status,
      message: error instanceof Error ? error.message : String(error),
    });
    if (resolved.route.provider === "openai") throw error;
  }
  return call(resolveModel("chat", "light"));
}

/** Raw provider cost → credits (1 credit ≈ $0.01). */
export function creditsForUsage(route: Route, usage: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number } | undefined | null) {
  if (!usage) return 0.05;
  const input = usage.prompt_tokens ?? 0;
  // Hidden "thinking" tokens are billed as output; some providers only count them in total_tokens.
  const output = Math.max(usage.completion_tokens ?? 0, (usage.total_tokens ?? 0) - input);
  const dollars = (input * route.inPerM + output * route.outPerM) / 1_000_000;
  return Math.max(0.01, Math.round(dollars * 100 * 1000) / 1000);
}

/** Image models: Flare for everyday generation, Sunburst for premium. */
export function imageModel(premium = false) {
  return premium
    ? env("PRODUCT_IMAGE_MODEL_PREMIUM") ?? "gpt-image-2.5-sunburst"
    : env("PRODUCT_IMAGE_MODEL") ?? "gpt-image-2.5-flare";
}

/** For a LiteLLM config: the alias → provider model table. */
export function litellmAliases() {
  return (Object.keys(ROUTES) as AiJob[]).flatMap((job) =>
    (Object.keys(ROUTES[job]) as AiLevel[]).map((level) => ({
      alias: `dekaz-${job}-${level}`,
      model: `${ROUTES[job][level].provider}/${ROUTES[job][level].model}`,
    })),
  );
}
