/**
 * Studio chat conversation loop — system prompt + agentic tool-calling.
 *
 * Mirrors the loop shape of nmh-os's `lib/domains/dekaz/conversation.ts`
 * (bounded tool rounds, tools closed over the authenticated session, optional
 * `onTextDelta` for live-typing UIs) but is built on the OpenAI `tool_calls`
 * format, since Sweet'Oh already ships the OpenAI SDK. No new dependency, and
 * no call to nmh-os — this is Sweet'Oh's own chat.
 */

import type OpenAI from "openai";
import type { SessionUser } from "@/lib/domains/identity/types";
import {
  getStudioChatClient,
  isStudioChatConfigured,
  logStudioChatFailure,
  studioChatModel,
} from "./provider";
import { buildStudioChatTools, type StudioToolResult } from "./tools";

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
const MAX_TOKENS = 1024;
const MAX_HISTORY_TURNS = 20;

function buildSystemPrompt(session: SessionUser): string {
  const name = session.appUser.name ?? session.appUser.email;
  const isCreator = session.role === "creator";

  return [
    "You are the Sweet'Oh Studio assistant — the chat bar docked above the partner workspace of Sweet'Oh Creations, a print-on-demand studio.",
    `You are talking to ${name} (role: ${session.role}).`,
    "",
    "You are a second way to drive the same workspace her buttons drive. When she asks for something you have a tool for, call the tool — do not describe what she should click instead.",
    "",
    "Ground rules:",
    "- Never invent listings, orders, ids, counts, prices, or statuses. If you do not have it from a tool result, say so and offer to look.",
    "- Confirm real, destructive-feeling actions (publishing, rejecting, marking shipped) in one short sentence before doing them only if she was ambiguous about which item she meant. If she was specific, just do it and report the result.",
    isCreator
      ? "- She is a creator: she can draft and submit, but only the Sweet'Oh partner can publish, approve, or reject. If she asks you to publish something, say plainly that publishing is the partner's call and offer to submit it for review instead."
      : "- She is the Sweet'Oh partner/owner: she can publish, approve, and reject listings, and update order status.",
    "- Photos cannot be attached through chat. For a photo-based draft, point her at the Create screen's photo upload.",
    "",
    "The workspace has five places: Overview (/partner), Create (/partner/create), Review (/partner/review), Orders (/partner/orders), and Products (/partner/products).",
    "",
    "Style: warm, short, plain English. No markdown headers, no bullet walls. A sentence or two, then the facts that matter.",
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
  if (!isStudioChatConfigured()) {
    return null;
  }

  const { session, userMessage, onTextDelta, onToolEvent } = opts;
  const history = opts.history.slice(-MAX_HISTORY_TURNS);

  try {
    const client = getStudioChatClient();
    const model = studioChatModel();
    const tools = buildStudioChatTools(session);
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
      { role: "system", content: buildSystemPrompt(session) },
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

    for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
      const completion = await client.chat.completions.create({
        model,
        max_tokens: MAX_TOKENS,
        messages,
        tools: toolDefs,
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
        // No true token streaming here: reassembling OpenAI tool-call argument
        // deltas alongside text deltas is materially more complex than the
        // Anthropic path nmh-os streams, and the SSE route already sends
        // whatever arrives as one chunk — so this degrades to a fast,
        // single-chunk reply rather than a broken one.
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
    logStudioChatFailure("runStudioChatTurn", error);
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
