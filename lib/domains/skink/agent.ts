/**
 * Skink — Sweet'Oh AI, the creator's print-on-demand teacher and agent.
 *
 * The conversation runs on the CHAT job (OpenAI). When a question needs real
 * judgement Skink calls `think_it_through` (REASON job → Anthropic); when it
 * needs fresh market knowledge it calls `research` (RESEARCH job → Gemini).
 * That is the Dekaz split, done as tools so one conversation can use all three.
 *
 * Every provider call is metered into credits (1 credit ≈ $0.01 raw cost).
 */
import type OpenAI from "openai";
import { z } from "zod";
import { resolveModel, creditsForUsage, type AiJob, type ResolvedModel } from "@/lib/ai/router";
import type { AiLevel, Plan } from "@/lib/domains/creator/plans";
import { listPrintifyBlueprints } from "@/lib/integrations/printify/catalog";
import { listPartnerLibraryDesigns } from "@/lib/domains/catalog/partner-design-library";
import type { SessionUser } from "@/lib/domains/identity/types";
import { forgetMemory, listMemories, memoryPromptBlock, rememberFact, MEMORY_KINDS, type Memory } from "./memory";
import { buildHandoffPack, HANDOFF_TASKS, taskById, toolById, TOOLS as OWNABLE_TOOLS } from "./handoff";
import type { SkinkTurn } from "./threads";

type ChatMessage = OpenAI.Chat.Completions.ChatCompletionMessageParam;
type Tool = OpenAI.Chat.Completions.ChatCompletionTool;

export type SkinkEvent = { tool: string; summary: string; href?: string };
export type SkinkReply = { reply: string; credits: number; events: SkinkEvent[]; models: string[] };
/** Live progress while a turn runs, so the chat can type as Skink thinks. */
export type SkinkStream = {
  onDelta?: (text: string) => void;
  onEvent?: (event: SkinkEvent) => void;
  /** "Researching…", "Thinking it through…" — what he's doing right now. */
  onStatus?: (status: string | null) => void;
  signal?: AbortSignal;
};

const TOOL_STATUS: Record<string, string> = {
  remember: "Saving that to your brand…",
  forget: "Forgetting that…",
  find_products: "Looking through the catalog…",
  list_my_designs: "Checking your designs…",
  research: "Researching…",
  think_it_through: "Thinking it through…",
  prepare_handoff: "Preparing it for your own tool…",
};

const PERSONA = `You are Skink — Sweet'Oh AI. You're a green tree skink (Lamprolepis smaragdina), the guide of Sweet'Oh, a Micronesian-owned print-on-demand company. Sweet'Oh helps islanders — and anyone — start and grow their own POD brand with an easier experience than doing it alone.

Who you are:
- A warm, sharp, professional POD creative director and teacher. Think: the friend who has built successful Etsy/Shopify POD brands and explains things simply.
- You TEACH as you help: briefly say why, not just what. Build the creator's confidence and skill over time.
- Island-proud and welcoming, never corny. Light humour is fine. No emoji walls.

How you talk:
- Short, clear answers. Use small lists or steps when useful. One question at a time.
- Plain language first; define jargon (blueprint, print provider, base cost, margin, mockup, niche) the first time.
- Never invent prices, fees, sales numbers, trademarks or policies. If unsure, say so or use the research tool.
- Never produce designs that copy logos, trademarks, sports teams, characters or someone else's art. Steer to original work.

What Sweet'Oh gives creators (describe accurately):
- Sweet'Oh Studio: a design editor on the Printify product catalog (tees, hoodies, mugs, totes, hats and more), with AI design, patterns, text, layers, print-ready 300 DPI files.
- Send to Printify: creators connect THEIR OWN Printify account and Sweet'Oh creates the product in their shop; from Printify they can sell on Etsy, Shopify, TikTok Shop and more. Their store, their Stripe/payments, their money.
- Print with Sweet'Oh: creators can request that the Sweet'Oh shop (Lacey, Washington) prints an order, when the shop has capacity. The shop reviews each request and sends a quote.
- Sweet'Oh doesn't host creator websites yet — that's coming.

Where things are in the app (link with these paths): Catalog /studio/catalog, Design editor /studio/design, My designs /studio/designs, Memory /studio/memory, Plans & credits /studio/plans, Printify connection /studio/settings, Print requests /studio/requests.

Memory:
- You have a private memory for this creator. When they tell you something durable — brand name, niche, audience, style, goals, decisions, what worked or flopped, corrections — save it with the remember tool (one fact per call, concise). Don't save small talk or one-off requests. Update rather than duplicate.
- If they ask you to forget something, use the forget tool.

Using what the creator already has:
- Sweet'Oh isn't trying to replace ChatGPT, Claude, Gemini, Canva, Printify or anyone else. You're the agent; those are resources you know how to use, alongside your own.
- When a creator already pays for a tool that suits the job — a long research piece, heavy image work, video, a big writing job — offer to prepare it for THAT tool with prepare_handoff. It costs them no Sweet'Oh credits and makes their subscription worth more. Then continue from whatever they bring back.
- Use your own capabilities when they're the better or faster path, and for anything that touches their Sweet'Oh workspace (designs, products, memory, print files).

Tools: use find_products to suggest real catalog products (always give the link). Use research for current market/trend/niche questions. Use think_it_through for strategy, pricing, brand positioning, or a plan with trade-offs. Use prepare_handoff to hand work to a tool the creator already pays for. Don't call tools for simple chat.`;

const VISITOR_PERSONA = `${PERSONA}

This person is a visitor who hasn't signed up. Be genuinely helpful in a few sentences, teach one useful thing, and when it fits, invite them to create a free account at /studio/join to design in the Studio, save their work and have you remember their brand. You can't use tools or remember anything for visitors. Shoppers who just want to buy can browse /collections.`;

const TOOLS: Tool[] = [
  {
    type: "function",
    function: {
      name: "remember",
      description: "Save one durable fact about this creator to their private memory.",
      parameters: {
        type: "object",
        properties: {
          kind: { type: "string", enum: [...MEMORY_KINDS] },
          title: { type: "string", description: "Short label, e.g. 'Brand name' or 'Target audience'" },
          body: { type: "string", description: "The fact itself, one or two sentences." },
        },
        required: ["kind", "title", "body"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "forget",
      description: "Remove a memory the creator asked you to forget, by its id.",
      parameters: { type: "object", properties: { id: { type: "string" } }, required: ["id"] },
    },
  },
  {
    type: "function",
    function: {
      name: "find_products",
      description: "Search the Printify product catalog available in Sweet'Oh Studio.",
      parameters: {
        type: "object",
        properties: { query: { type: "string", description: "e.g. 'hoodie', 'mug', 'kids tee', 'tote'" } },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_my_designs",
      description: "List the creator's saved designs in Sweet'Oh Studio.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "prepare_handoff",
      description: "Prepare a ready-to-paste prompt (with this creator's brand context) for a tool they already pay for, e.g. ChatGPT, Claude, Gemini or Canva. Costs the creator no credits.",
      parameters: {
        type: "object",
        properties: {
          tool: { type: "string", enum: OWNABLE_TOOLS.map((t) => t.id), description: "Only a tool the creator says they have." },
          task: { type: "string", enum: HANDOFF_TASKS.map((t) => t.id) },
          brief: { type: "string", description: "The specifics: the niche, product or idea." },
        },
        required: ["tool", "task", "brief"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "research",
      description: "Research current POD market questions: niches, trends, competitors, what sells, marketplace rules.",
      parameters: { type: "object", properties: { question: { type: "string" } }, required: ["question"] },
    },
  },
  {
    type: "function",
    function: {
      name: "think_it_through",
      description: "Careful reasoning for strategy, pricing, brand positioning, product-line plans or decisions with trade-offs.",
      parameters: {
        type: "object",
        properties: { question: { type: "string" }, context: { type: "string", description: "Relevant facts to consider." } },
        required: ["question"],
      },
    },
  },
];

function chatParams(resolved: ResolvedModel, withTools: boolean) {
  // gpt-5.6 models only accept function tools on chat completions with reasoning off.
  return withTools && resolved.route.provider === "openai" && resolved.route.model.startsWith("gpt-5")
    ? { reasoning_effort: "none" as const }
    : {};
}

/** OpenAI wants max_completion_tokens; the Anthropic/Gemini compatibility layers take max_tokens. */
function tokenLimit(resolved: ResolvedModel, n: number) {
  return resolved.route.provider === "openai" && !process.env.AI_BASE_URL ? { max_completion_tokens: n } : { max_tokens: n };
}

type FunctionCall = OpenAI.Chat.Completions.ChatCompletionMessageFunctionToolCall;
type StreamedTurn = { content: string; toolCalls: FunctionCall[]; usage: OpenAI.CompletionUsage | undefined };

/** One model round, streamed. Text deltas go out live; tool calls accumulate. */
async function streamRound(
  resolved: ResolvedModel,
  messages: ChatMessage[],
  tools: Tool[] | undefined,
  live: SkinkStream | undefined,
): Promise<StreamedTurn> {
  const stream = await resolved.client.chat.completions.create(
    {
      model: resolved.model,
      messages,
      ...(tools ? { tools } : {}),
      ...tokenLimit(resolved, 1200),
      ...chatParams(resolved, Boolean(tools)),
      stream: true,
      // Usage arrives in a final chunk when the provider supports it.
      ...(resolved.route.provider === "openai" && !process.env.AI_BASE_URL ? { stream_options: { include_usage: true } } : {}),
    },
    { signal: live?.signal },
  );
  let content = "";
  let usage: OpenAI.CompletionUsage | undefined;
  const partial = new Map<number, { id: string; name: string; args: string }>();
  for await (const chunk of stream) {
    if (chunk.usage) usage = chunk.usage;
    const delta = chunk.choices?.[0]?.delta;
    if (!delta) continue;
    if (delta.content) {
      content += delta.content;
      live?.onDelta?.(delta.content);
    }
    for (const call of delta.tool_calls ?? []) {
      const slot = partial.get(call.index) ?? { id: "", name: "", args: "" };
      if (call.id) slot.id = call.id;
      if (call.function?.name) slot.name = call.function.name;
      if (call.function?.arguments) slot.args += call.function.arguments;
      partial.set(call.index, slot);
    }
  }
  const toolCalls = [...partial.values()]
    .filter((c) => c.name)
    .map((c) => ({ id: c.id || `call_${c.name}`, type: "function" as const, function: { name: c.name, arguments: c.args || "{}" } }));
  return { content, toolCalls, usage };
}

class Meter {
  credits = 0;
  models = new Set<string>();
  add(resolved: ResolvedModel, usage: OpenAI.CompletionUsage | undefined) {
    this.credits += creditsForUsage(resolved.route, usage);
    this.models.add(resolved.model);
  }
}

/** Provider-specific knobs: Gemini 3 thinks by default and can spend the whole budget before answering. */
function jobParams(resolved: ResolvedModel) {
  return resolved.route.provider === "gemini" && resolved.level !== "deep" ? { reasoning_effort: "low" as const } : {};
}

async function delegate(job: AiJob, level: AiLevel, system: string, prompt: string, meter: Meter) {
  const call = async (resolved: ResolvedModel) => {
    const res = await resolved.client.chat.completions.create({
      model: resolved.model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt },
      ],
      ...tokenLimit(resolved, level === "deep" ? 4000 : 1800),
      ...jobParams(resolved),
    });
    meter.add(resolved, res.usage);
    return res.choices[0]?.message?.content?.trim() || "";
  };
  const resolved = resolveModel(job, level);
  try {
    const answer = await call(resolved);
    if (answer) return answer;
  } catch (error) {
    // e.g. an unfunded provider account or an outage: keep Skink answering on the chat model.
    console.error("skink_delegate_fallback", { job, level, provider: resolved.route.provider, status: (error as { status?: number })?.status });
    if (resolved.route.provider === "openai") throw error;
  }
  return (await call(resolveModel("chat", "light"))) || "No answer came back.";
}

async function runTool(
  name: string,
  rawArgs: string,
  ctx: { session: SessionUser; level: AiLevel; meter: Meter; memoryBlock: string },
): Promise<{ result: string; event?: SkinkEvent }> {
  let args: Record<string, unknown> = {};
  try {
    args = JSON.parse(rawArgs || "{}");
  } catch {
    return { result: "Invalid tool arguments." };
  }
  const userId = ctx.session.appUser.id;
  switch (name) {
    case "remember": {
      const parsed = z.object({ kind: z.enum(MEMORY_KINDS), title: z.string(), body: z.string() }).safeParse(args);
      if (!parsed.success) return { result: "Couldn't save that memory." };
      const m = await rememberFact(userId, parsed.data);
      return { result: `Saved (id ${m.id}).`, event: { tool: "remember", summary: `Remembered: ${m.title}`, href: "/studio/memory" } };
    }
    case "forget": {
      const ok = await forgetMemory(userId, String(args.id ?? ""));
      return { result: ok ? "Forgotten." : "No memory with that id.", event: ok ? { tool: "forget", summary: "Forgot a memory", href: "/studio/memory" } : undefined };
    }
    case "find_products": {
      const q = String(args.query ?? "").toLowerCase().trim();
      const rows = await listPrintifyBlueprints().catch(() => []);
      const words = q.split(/\s+/).filter(Boolean);
      const hits = rows
        .filter((b) => words.every((w) => `${b.title} ${b.brand} ${b.model}`.toLowerCase().includes(w.replace(/s$/, ""))))
        .slice(0, 8)
        .map((b) => `- ${b.title} (${[b.brand, b.model].filter(Boolean).join(" ")}) → /studio/catalog/printify-${b.id}`);
      return {
        result: hits.length ? hits.join("\n") : "No catalog products matched. Try a simpler word like 'tee', 'hoodie' or 'mug'.",
        event: hits.length ? { tool: "find_products", summary: `Found ${hits.length} products for “${q}”`, href: "/studio/catalog" } : undefined,
      };
    }
    case "list_my_designs": {
      const rows = await listPartnerLibraryDesigns(ctx.session.ventureId).catch(() => []);
      const designs = rows.filter((r) => r.isComposition).slice(0, 15);
      return {
        result: designs.length
          ? designs.map((d) => `- ${d.name} → /studio/design?composition=${d.id}`).join("\n")
          : "No saved designs yet.",
      };
    }
    case "prepare_handoff": {
      const tool = toolById(String(args.tool ?? ""));
      const task = taskById(String(args.task ?? ""));
      if (!tool || !task) return { result: "Unknown tool or task." };
      const pack = buildHandoffPack({ tool, task, brief: String(args.brief ?? "").slice(0, 1500), memories: await listMemories(userId), name: ctx.session.appUser.name });
      return {
        result: `Ready for ${tool.name}. In your reply you MUST paste the block below word for word, between two lines of "———", so the creator can copy it. Say one short line before it and one after: that they run it in ${tool.name}, and that you'll carry on when they paste the answer back here.\n\n${pack}`,
        event: { tool: "prepare_handoff", summary: `Prepared for ${tool.name} — no credits used`, href: "/studio/tools" },
      };
    }
    case "research": {
      const question = String(args.question ?? "").slice(0, 1500);
      const answer = await delegate(
        "research",
        ctx.level,
        "You are a print-on-demand market researcher. Answer with current, specific, practical findings. Flag uncertainty and anything that varies by marketplace. Be concise: bullet points, under 250 words.",
        question,
        ctx.meter,
      );
      return { result: answer, event: { tool: "research", summary: "Researched the market" } };
    }
    case "think_it_through": {
      const question = String(args.question ?? "").slice(0, 2000);
      const context = String(args.context ?? "").slice(0, 3000);
      const answer = await delegate(
        "reason",
        ctx.level,
        `You are a senior print-on-demand business strategist advising an independent creator. Reason carefully, weigh trade-offs, and end with a clear recommendation and next step. Under 300 words.\n\n${ctx.memoryBlock}`,
        context ? `${question}\n\nContext:\n${context}` : question,
        ctx.meter,
      );
      return { result: answer, event: { tool: "think_it_through", summary: "Thought it through" } };
    }
    default:
      return { result: `Unknown tool ${name}.` };
  }
}

/** One creator turn: memory-aware, tool-using, metered. */
export async function runCreatorTurn(input: {
  session: SessionUser;
  plan: Plan;
  level: AiLevel;
  history: SkinkTurn[];
  message: string;
  balance: number;
  /** Subscriptions the creator already pays for (see ./handoff.ts). */
  tools?: string[] | null;
  /** Prefetched alongside the other setup queries, to get the model started sooner. */
  memories?: Memory[];
}, live?: SkinkStream): Promise<SkinkReply> {
  const memories = input.memories ?? (await listMemories(input.session.appUser.id));
  const memoryBlock = memoryPromptBlock(memories);
  const name = input.session.appUser.name?.split(" ")[0] ?? null;
  const owned = (input.tools ?? []).map((id) => toolById(id)).filter((t): t is NonNullable<typeof t> => Boolean(t));
  const system = [
    PERSONA,
    `Creator: ${name ?? "(name not given yet)"} · Plan: ${input.plan.name} · Credits left: ${Math.floor(input.balance)}.`,
    owned.length
      ? `Tools this creator already pays for: ${owned.map((t) => `${t.name} (${t.good})`).join("; ")}. Offer prepare_handoff when one of these suits the job.`
      : `This creator hasn't told you what tools they already pay for. If a job would suit their own ChatGPT/Claude/Gemini/Canva subscription, mention they can add their tools at /studio/tools so you can prepare the work for free.`,
    memoryBlock,
  ].join("\n\n");

  const meter = new Meter();
  const events: SkinkEvent[] = [];
  const resolved = resolveModel("chat", input.level);
  const messages: ChatMessage[] = [
    { role: "system", content: system },
    ...input.history.slice(-20).map((t) => ({ role: t.role, content: t.content }) as ChatMessage),
    { role: "user", content: input.message },
  ];

  for (let round = 0; round < 5; round++) {
    live?.onStatus?.(round === 0 ? "Thinking…" : null);
    const turn = await streamRound(resolved, messages, TOOLS, live);
    meter.add(resolved, turn.usage);
    if (!turn.toolCalls.length) {
      live?.onStatus?.(null);
      const reply = turn.content.trim() || "Hmm, I lost my words there — try again?";
      return { reply, credits: meter.credits, events, models: [...meter.models] };
    }
    messages.push({ role: "assistant", content: turn.content || null, tool_calls: turn.toolCalls });
    for (const call of turn.toolCalls) {
      live?.onStatus?.(TOOL_STATUS[call.function.name] ?? "Working on it…");
      const out = await runTool(call.function.name, call.function.arguments, { session: input.session, level: input.level, meter, memoryBlock }).catch(
        (error: unknown) => ({ result: `Tool failed: ${error instanceof Error ? error.message : "unknown error"}`, event: undefined }),
      );
      if (out.event) {
        events.push(out.event);
        live?.onEvent?.(out.event);
      }
      messages.push({ role: "tool", tool_call_id: call.id, content: out.result.slice(0, 6000) });
    }
    live?.onStatus?.(null);
  }
  return { reply: "I did a lot of digging there — ask me to summarize what I found?", credits: meter.credits, events, models: [...meter.models] };
}

/** Visitors: cheapest model, no tools, no memory. */
export async function runVisitorTurn(input: { history: SkinkTurn[]; message: string }): Promise<string> {
  const resolved = resolveModel("chat", "light");
  const res = await resolved.client.chat.completions.create({
    model: resolved.model,
    messages: [
      { role: "system", content: VISITOR_PERSONA },
      ...input.history.slice(-10).map((t) => ({ role: t.role, content: t.content.slice(0, 2000) }) as ChatMessage),
      { role: "user", content: input.message },
    ],
    ...tokenLimit(resolved, 500),
  });
  return res.choices[0]?.message?.content?.trim() || "Ask me anything about print-on-demand!";
}
