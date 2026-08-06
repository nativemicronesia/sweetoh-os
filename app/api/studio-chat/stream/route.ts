import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/domains/identity/service";
import {
  parseStudioChatRequest,
  runStudioChatTurn,
} from "@/lib/domains/studio-chat/conversation";

/**
 * SSE Studio chat — same conversation loop as the JSON route, but tool
 * confirmations and answer text are pushed as they resolve, mirroring nmh-os's
 * `onTextDelta` pattern so the chat bar can type live instead of waiting on a
 * whole turn.
 *
 * Events: `tool` (one per tool call, as it completes), `delta` (answer text),
 * `done` (final payload), `error`.
 */

const encoder = new TextEncoder();

function sseEvent(event: string, data: unknown): Uint8Array {
  return encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

export async function POST(request: NextRequest) {
  const session = await getSessionUser();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const { message, history } = parseStudioChatRequest(body);

  if (!message) {
    return NextResponse.json({ error: "Say something first." }, { status: 400 });
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const result = await runStudioChatTurn({
          session,
          history,
          userMessage: message,
          onToolEvent: (event) => controller.enqueue(sseEvent("tool", event)),
          onTextDelta: (delta) =>
            controller.enqueue(sseEvent("delta", { delta })),
        });

        if (!result) {
          controller.enqueue(
            sseEvent("error", {
              error:
                "Sweet'Oh AI is unavailable right now — try again in a moment.",
            }),
          );
        } else {
          controller.enqueue(sseEvent("done", result));
        }
      } catch {
        controller.enqueue(
          sseEvent("error", { error: "Sweet'Oh AI hit an error — try again." }),
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
