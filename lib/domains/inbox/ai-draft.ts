/**
 * "Draft with Sweet'Oh AI": a warm first draft of a reply the partner edits
 * and sends herself. Nothing is ever sent automatically.
 */
import { isAiConfigured, jobParams, resolveModel, runWithFallback, tokenLimit } from "@/lib/ai/router";
import type { SessionUser } from "@/lib/domains/identity/types";
import { formatPrice } from "@/lib/shared/format";
import { ValidationError } from "@/lib/shared/errors";
import { getThread } from "./service";

const SYSTEM = `You write email replies for Sweet'Oh Creations, a small Micronesian-owned print shop in Lacey, Washington (custom apparel and gifts, made to order).
Write as the shop owner: warm, friendly, clear and short (under 120 words). Plain text only, no subject line, no markdown.
Answer what the customer actually asked. Never invent prices, dates, stock or policies you weren't given; if something needs confirming, say you'll check and follow up.
Sign off with "— Sweet'Oh Creations".`;

export async function draftReply(session: SessionUser, threadId: string, hint?: string) {
  if (!isAiConfigured()) throw new ValidationError("Sweet'Oh AI isn't switched on yet.");
  const { thread, messages, customer } = await getThread(session, threadId);
  const convo = messages
    .slice(-6)
    .map((m) => `${m.direction === "in" ? `Customer (${m.fromName ?? m.fromEmail})` : "Shop"}: ${(m.textBody ?? m.snippet ?? "").slice(0, 2500)}`)
    .join("\n\n---\n\n");
  const facts = customer
    ? [
        ...customer.orders.map((o) => `Order ${o.id.slice(0, 8)} · ${formatPrice(o.totalCents)} · ${o.status} · ${o.createdAt.toDateString()}`),
        ...customer.requests.map((r) => `Custom request: ${r.productType} · ${r.status}`),
      ].join("\n")
    : "";
  const prompt = [
    `Subject: ${thread.subject}`,
    facts && `What the shop knows about this customer:\n${facts}`,
    `Conversation (oldest first):\n${convo}`,
    hint?.trim() && `The owner wants the reply to say: ${hint.trim().slice(0, 500)}`,
    "Write the reply now.",
  ]
    .filter(Boolean)
    .join("\n\n");

  return runWithFallback(resolveModel("chat", "light"), async (resolved) => {
    const res = await resolved.client.chat.completions.create({
      model: resolved.model,
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: prompt },
      ],
      ...tokenLimit(resolved, 600),
      ...jobParams(resolved),
    });
    return res.choices[0]?.message?.content?.trim() || "";
  });
}
