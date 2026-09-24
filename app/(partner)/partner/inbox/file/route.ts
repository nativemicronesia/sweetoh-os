import { NextResponse } from "next/server";
import { requirePartnerWorkspace } from "@/lib/domains/identity/service";
import { attachmentLink } from "@/lib/domains/inbox/service";

/** Attachments open through a fresh signed link (Resend's links expire after an hour). */
export async function GET(request: Request) {
  const session = await requirePartnerWorkspace();
  const url = new URL(request.url);
  const messageId = url.searchParams.get("m");
  const attachmentId = url.searchParams.get("a");
  if (!messageId || !attachmentId) return NextResponse.json({ error: "Missing attachment" }, { status: 400 });
  try {
    return NextResponse.redirect(await attachmentLink(session, messageId, attachmentId));
  } catch {
    return NextResponse.json({ error: "Attachment not found" }, { status: 404 });
  }
}
