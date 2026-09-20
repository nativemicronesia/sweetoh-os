import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getSessionUserFast } from "@/lib/domains/identity/service";
import { creditSnapshot, getCreatorProfile, spendCredits } from "@/lib/domains/creator/credits";
import type { AiLevel } from "@/lib/domains/creator/plans";
import { runCreatorTurn } from "@/lib/domains/skink/agent";
import { appendMessages, createThread, listMessages } from "@/lib/domains/skink/threads";
import { listMemories } from "@/lib/domains/skink/memory";
import { isAiConfigured } from "@/lib/ai/router";

/**
 * Skink, streamed. Same turn as the server action, but the answer types out as
 * it is written and each tool announces itself, so the creator watches the work
 * instead of a spinner.
 *
 * Events: `status` (what he's doing), `delta` (answer text), `event` (tool card),
 * `done` (thread + credits), `error`.
 */
export const maxDuration = 300;

const encoder = new TextEncoder();
const sse = (event: string, data: unknown) => encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

const bodySchema = z.object({
  message: z.string().trim().min(1).max(4000),
  threadId: z.string().uuid().nullish(),
  level: z.enum(["light", "smart", "deep"]).nullish(),
});

export async function POST(request: NextRequest) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Type a message first." }, { status: 400 });
  if (!isAiConfigured()) return NextResponse.json({ error: "Sweet'Oh AI isn't switched on yet." }, { status: 503 });
  const { message, threadId } = parsed.data;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        try {
          controller.enqueue(sse(event, data));
        } catch {
          // The creator navigated away mid-answer; the turn still finishes and is saved.
        }
      };
      // The pipe opens before any database work, so the chat shows progress immediately.
      send("status", { status: "Thinking…" });
      try {
        const session = await getSessionUserFast();
        if (!session || session.role !== "creator") {
          send("error", { error: "Sign in to chat with Skink.", code: "auth" });
          return;
        }
        // Everything the turn needs, fetched at once.
        const profilePromise = getCreatorProfile(session.appUser.id);
        const [profile, memories, history, thread] = await Promise.all([
          profilePromise,
          listMemories(session.appUser.id),
          threadId
            ? listMessages(session.appUser.id, threadId).then((rows) => rows.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })))
            : Promise.resolve([] as { role: "user" | "assistant"; content: string }[]),
          threadId ? Promise.resolve({ id: threadId }) : createThread(session.appUser.id, message),
        ]);
        const { balance, plan } = await creditSnapshot(session.appUser.id, profile);
        if (balance < 0.2) {
          send("error", { error: "You're out of credits this month. Upgrade or top up to keep going.", code: "credits" });
          return;
        }
        const level: AiLevel = parsed.data.level && plan.levels.includes(parsed.data.level) ? parsed.data.level : plan.levels.includes("smart") ? "smart" : "light";
        const result = await runCreatorTurn(
          { session, plan, level, history, message, balance, tools: profile?.tools, memories },
          {
            signal: request.signal,
            onDelta: (delta) => send("delta", { delta }),
            onEvent: (event) => send("event", event),
            onStatus: (status) => send("status", { status }),
          },
        );
        await spendCredits({
          userId: session.appUser.id,
          amount: result.credits,
          reason: "Skink chat",
          metadata: { models: result.models, level, threadId: thread.id },
          allowOverdraft: true,
        });
        await appendMessages(session.appUser.id, thread.id, [
          { role: "user", content: message },
          { role: "assistant", content: result.reply, metadata: { events: result.events, credits: result.credits, level } },
        ]);
        send("done", { threadId: thread.id, credits: result.credits, balance: Math.max(0, balance - result.credits), events: result.events, reply: result.reply });
      } catch (error) {
        const aborted = request.signal.aborted || (error as { name?: string })?.name === "AbortError";
        if (!aborted) console.error("skink_stream_failed", error instanceof Error ? error.message : error);
        send("error", { error: aborted ? "Stopped." : "I couldn't finish that. Try again in a moment." });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive" },
  });
}
