import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/domains/identity/service";
import {
  parseStudioChatRequest,
  runStudioChatTurn,
} from "@/lib/domains/studio-chat/conversation";

/**
 * Non-streaming Studio chat. Same auth surface as the partner workspace: an
 * authenticated Sweet'Oh session (partner, owner, or creator). Tools are built
 * from that session, so role gating is identical to the buttons.
 */
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

  const result = await runStudioChatTurn({ session, history, userMessage: message });

  if (!result) {
    return NextResponse.json(
      { error: "Sweet'Oh AI is unavailable right now — try again in a moment." },
      { status: 503 },
    );
  }

  return NextResponse.json(result);
}
