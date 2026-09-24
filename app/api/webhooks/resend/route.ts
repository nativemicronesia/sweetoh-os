import { NextResponse } from "next/server";
import { getServerEnv } from "@/lib/config/env";
import { ingestReceivedEmail } from "@/lib/domains/inbox/service";
import { verifyWebhookSignature } from "@/lib/domains/inbox/rules";
import { logger } from "@/lib/shared/logger";

/**
 * Resend webhook: `email.received` for every email sent to the shop's
 * domain. Signed with Svix headers; the body only carries metadata, so the
 * inbox fetches the full email itself. Other event types are acknowledged
 * and ignored.
 */
export async function POST(request: Request) {
  const secret = getServerEnv().resendWebhookSecret;
  if (!secret) return NextResponse.json({ error: "Inbox webhook is not configured" }, { status: 503 });

  const body = await request.text();
  const valid = verifyWebhookSignature({
    secret,
    id: request.headers.get("svix-id"),
    timestamp: request.headers.get("svix-timestamp"),
    signature: request.headers.get("svix-signature"),
    body,
  });
  if (!valid) {
    logger.error("resend_webhook_signature_invalid", {});
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const event = JSON.parse(body) as { type?: string; data?: { email_id?: string } };
  if (event.type !== "email.received" || !event.data?.email_id) return NextResponse.json({ received: true });

  try {
    const { threadId, duplicate } = await ingestReceivedEmail(event.data.email_id);
    return NextResponse.json({ received: true, threadId, duplicate });
  } catch (error) {
    // 500 makes Resend retry with backoff; ingest is idempotent on the email id.
    logger.error("inbox_ingest_failed", { emailId: event.data.email_id, error: String(error) });
    return NextResponse.json({ error: "Could not store the email" }, { status: 500 });
  }
}
