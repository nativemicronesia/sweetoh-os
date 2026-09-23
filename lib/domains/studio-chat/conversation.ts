/**
 * Sweet'Oh AI for the partner — Skink in her back office.
 *
 * The conversation runs on the Dekaz CHAT job (lib/ai/router.ts → OpenAI).
 * Her shop tools (./tools.ts) drive the same workspace her buttons do; Skink's
 * own tools (./skink-tools.ts) add private memory, research and careful
 * reasoning — all Dekaz jobs, all on OpenAI.
 */

import type OpenAI from "openai";
import type { SessionUser } from "@/lib/domains/identity/types";
import { isAiConfigured, resolveModel, tokenLimit, toolParams, type ResolvedModel } from "@/lib/ai/router";
import { listMemories, type Memory } from "@/lib/domains/skink/memory";
import { buildStudioChatTools, type StudioToolResult } from "./tools";
import { buildSkinkPartnerTools } from "./skink-tools";

export type StudioChatTurn = { role: "user" | "assistant"; content: string };

/** What the UI renders as an inline confirmation card. */
export type StudioChatToolEvent = {
  name: string;
  ok: boolean;
  summary: string;
};

export type StudioChatResult = {
  text: string;
  toolEvents: StudioChatToolEvent[];
  /** True when the model hit the token ceiling mid-answer. */
  truncated: boolean;
};

const MAX_TOOL_ROUNDS = 5;
const MAX_TOKENS = 1200;
const MAX_HISTORY_TURNS = 20;

function memoryBlock(memories: Memory[]): string {
  if (!memories.length) {
    return "You don't have anything saved about the shop yet. As she tells you durable things — best sellers, pricing rules, suppliers, customers, goals, decisions — save them with the remember tool.";
  }
  const lines = memories
    .slice(0, 60)
    .map((m) => `- [${m.kind}] (id ${m.id}) ${m.title}${m.body ? `: ${m.body.replace(/\s+/g, " ").slice(0, 400)}` : ""}`);
  return `What you remember about the shop and about her (private — use it naturally, don't recite it):\n${lines.join("\n")}`;
}

function buildSystemPrompt(session: SessionUser, memories: string): string {
  const name = session.appUser.name?.split(" ")[0] ?? session.appUser.email;

  return [
    "You are Skink — Sweet'Oh AI. You're a green tree skink (Lamprolepis smaragdina), the guide of Sweet'Oh Creations, an independent Micronesian-owned print shop in Lacey, Washington serving all ages.",
    `You are working with ${name}, the Sweet'Oh partner who runs the shop. You live in her back office: a sharp, warm right hand for running and growing the shop.`,
    "",
    "What you do for her:",
    "- Drive the workspace: when she asks for something you have a tool for, call the tool — do not describe what she should click instead.",
    "- Help her grow: product ideas, pricing, what sells, customers, marketing, planning. Use research for current market questions and think_it_through for pricing, strategy and decisions with trade-offs.",
    "- Remember: when she tells you something durable about the shop or how she likes to work, save it with remember (one fact per call, concise). Don't save small talk. If she asks you to forget something, use forget.",
    "",
    "Ground rules:",
    "- Never invent listings, orders, ids, counts, prices, fees or statuses. If you do not have it from a tool result, say so and offer to look.",
    "- Confirm destructive-feeling actions (publishing, rejecting, marking shipped) in one short sentence only if she was ambiguous about which item she meant. If she was specific, just do it and report the result.",
    "- She is the partner/owner: she can publish, approve, and reject listings, and update order status.",
    "- Photos cannot be attached through chat. For a photo-based listing, point her at List a product (/partner/list).",
    "- Never suggest designs that copy logos, trademarks, sports teams, characters or someone else's art.",
    "",
    "The workspace: Home (/partner), List a product (/partner/list), Catalog (/partner/catalog), Design studio (/partner/canvas), My products (/partner/products), Orders (/partner/orders), Creator requests (/partner/creator-requests), My files (/partner/library), Settings (/partner/settings). Link with these paths.",
    "Blanks are private reusable tools, never shop listings. Don't claim an exact brand/model or print dimensions without evidence; she confirms the details.",
    "",
    "Style: warm, short, plain English. Island-proud, never corny. No markdown headers, no bullet walls. A sentence or two, then the facts that matter.",
    "",
    memories,
  ].join("\n");
}

/**
 * Runs one turn. Returns null when no model endpoint is configured or the
 * provider call fails outright — callers degrade gracefully, same discipline
 * as the rest of this codebase's AI integrations.
 */
export async function runStudioChatTurn(opts: {
  session: SessionUser;
  history: StudioChatTurn[];
  userMessage: string;
  onTextDelta?: (delta: string) => void;
  onToolEvent?: (event: StudioChatToolEvent) => void;
}): Promise<StudioChatResult | null> {
  if (!isAiConfigured()) {
    return null;
  }

  const { session, userMessage, onTextDelta, onToolEvent } = opts;
  const history = opts.history.slice(-MAX_HISTORY_TURNS);

  try {
    const memories = await listMemories(session.appUser.id).catch(() => [] as Memory[]);
    const block = memoryBlock(memories);
    const tools = [...buildStudioChatTools(session), ...buildSkinkPartnerTools(session, block)];
    const toolsByName = new Map(tools.map((tool) => [tool.name, tool]));

    const toolDefs: OpenAI.Chat.Completions.ChatCompletionTool[] = tools.map(
      (tool) => ({
        type: "function",
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.input_schema as Record<string, unknown>,
        },
      }),
    );

    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: "system", content: buildSystemPrompt(session, block) },
      ...history.map(
        (turn) =>
          ({
            role: turn.role,
            content: turn.content,
          }) as OpenAI.Chat.Completions.ChatCompletionMessageParam,
      ),
      { role: "user", content: userMessage },
    ];

    const toolEvents: StudioChatToolEvent[] = [];

    // Dekaz chat job. If OpenAI itself fails there's nothing lower to fall to.
    const resolved: ResolvedModel = resolveModel("chat", "smart");

    for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
      const completion = await resolved.client.chat.completions.create({
        model: resolved.model,
        messages,
        tools: toolDefs,
        ...tokenLimit(resolved, MAX_TOKENS),
        ...toolParams(resolved, true),
      });

      const choice = completion.choices[0];
      const message = choice?.message;
      const toolCalls = message?.tool_calls ?? [];

      const finished =
        choice?.finish_reason !== "tool_calls" ||
        toolCalls.length === 0 ||
        round === MAX_TOOL_ROUNDS;

      if (finished) {
        const text = (message?.content ?? "").trim();
        // Sent as one chunk; the SSE route and chat bar handle that fine.
        if (text && onTextDelta) {
          onTextDelta(text);
        }

        return {
          text:
            text ||
            (toolEvents.length > 0
              ? toolEvents.map((event) => event.summary).join("\n")
              : ""),
          toolEvents,
          truncated: choice?.finish_reason === "length",
        };
      }

      messages.push({
        role: "assistant",
        content: message?.content ?? null,
        tool_calls: toolCalls,
      });

      for (const call of toolCalls) {
        if (call.type !== "function") continue;

        const tool = toolsByName.get(call.function.name);
        let result: StudioToolResult;

        try {
          const input = call.function.arguments
            ? (JSON.parse(call.function.arguments) as Record<string, unknown>)
            : {};
          result = tool
            ? await tool.execute(input)
            : { ok: false, summary: `Unknown tool: ${call.function.name}` };
        } catch (error) {
          result = {
            ok: false,
            summary: `Tool failed: ${
              error instanceof Error ? error.message : "unknown error"
            }`,
          };
        }

        const event: StudioChatToolEvent = {
          name: call.function.name,
          ok: result.ok,
          summary: result.summary,
        };
        toolEvents.push(event);
        onToolEvent?.(event);

        messages.push({
          role: "tool",
          tool_call_id: call.id,
          content: JSON.stringify(result).slice(0, 8000),
        });
      }
    }

    return null;
  } catch (error) {
    console.error("[sweetoh-ai] runStudioChatTurn failed:", error instanceof Error ? error.message : error);
    return null;
  }
}

/** Shared request parsing for both chat routes. */
export function parseStudioChatRequest(body: unknown): {
  message: string;
  history: StudioChatTurn[];
} {
  const raw = (body ?? {}) as {
    message?: unknown;
    history?: unknown;
  };

  const message = typeof raw.message === "string" ? raw.message.trim() : "";

  const history: StudioChatTurn[] = Array.isArray(raw.history)
    ? raw.history
        .filter(
          (turn): turn is StudioChatTurn =>
            Boolean(turn) &&
            typeof turn === "object" &&
            (( turn as StudioChatTurn).role === "user" ||
              (turn as StudioChatTurn).role === "assistant") &&
            typeof (turn as StudioChatTurn).content === "string",
        )
        .map((turn) => ({ role: turn.role, content: turn.content }))
    : [];

  return { message, history };
}
