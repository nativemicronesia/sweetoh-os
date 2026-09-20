import { createHash } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import { skinkVisitorUsage } from "@/lib/db/schema";
import { getSessionUserFast } from "@/lib/domains/identity/service";
import { streamVisitorTurn } from "@/lib/domains/skink/agent";
import { isAiConfigured } from "@/lib/ai/router";

/** Skink on the storefront: streamed, cheapest model, capped per day per visitor. */
export const maxDuration = 120;
const VISITOR_DAILY_LIMIT = 12;
const encoder = new TextEncoder();
const sse = (event: string, data: unknown) => encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

const bodySchema = z.object({
  message: z.string().trim().min(1).max(1500),
  history: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(4000) })).max(10).default([]),
});

export async function POST(request: NextRequest) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Ask me something!" }, { status: 400 });
  if (!isAiConfigured()) return NextResponse.json({ error: "Sweet'Oh AI isn't switched on yet." }, { status: 503 });

  // A signed-in creator gets their real Skink instead (memory, tools, credits).
  const session = await getSessionUserFast().catch(() => null);
  if (session?.role === "creator") return NextResponse.json({ error: "Use the Studio chat.", code: "creator" }, { status: 409 });

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
  const key = createHash("sha256").update(`skink:${ip}`).digest("hex").slice(0, 32);
  const day = new Date().toISOString().slice(0, 10);
  const [usage] = await getDb()
    .insert(skinkVisitorUsage)
    .values({ key, day, count: 1 })
    .onConflictDoUpdate({ target: [skinkVisitorUsage.key, skinkVisitorUsage.day], set: { count: sql`${skinkVisitorUsage.count} + 1` } })
    .returning({ count: skinkVisitorUsage.count });
  if ((usage?.count ?? 0) > VISITOR_DAILY_LIMIT) {
    return NextResponse.json(
      { error: "That's today's free chats. Create a free account and I'll remember your brand and help you design.", code: "limit" },
      { status: 429 },
    );
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        try {
          controller.enqueue(sse(event, data));
        } catch {
          /* visitor closed the panel */
        }
      };
      try {
        await streamVisitorTurn({ history: parsed.data.history, message: parsed.data.message }, (delta) => send("delta", { delta }), request.signal);
        send("done", {});
      } catch (error) {
        if (!request.signal.aborted) console.error("skink_visitor_failed", error instanceof Error ? error.message : error);
        send("error", { error: "I couldn't answer that just now. Try again in a moment." });
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive" },
  });
}
