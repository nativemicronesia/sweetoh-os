/**
 * The shop inbox. Every email to @sweetohcreations.shop arrives through the
 * Resend receiving webhook (app/api/webhooks/resend), is stored as a thread,
 * sorted onto a shelf, and forwarded to the partner's own Gmail so nothing
 * depends on her opening the back office. Replies go out from the shop's
 * address and land back on the same thread.
 */
import { and, count, desc, eq, ilike, isNotNull, isNull, or, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { customer, customRequest, inboxMessage, inboxThread, order, type InboxCategory } from "@/lib/db/schema";
import { getServerEnv, isSweetohEmailConfigured } from "@/lib/config/env";
import { getDefaultVenture } from "@/lib/domains/identity/service";
import type { SessionUser } from "@/lib/domains/identity/types";
import { getResendClient } from "@/lib/integrations/email/resend";
import { logger } from "@/lib/shared/logger";
import { NotFoundError, ValidationError } from "@/lib/shared/errors";
import { getReceivedAttachment, getReceivedEmail, listReceivedAttachments } from "./resend-receiving";
import { categorize, domainOf, looksLikeSpam, parseAddress, replySubject, snippetOf, threadSubject } from "./rules";

export type InboxFolder = "inbox" | InboxCategory | "starred" | "sent" | "archived" | "spam";

export const INBOX_FOLDERS: { id: InboxFolder; label: string }[] = [
  { id: "inbox", label: "Everything" },
  { id: "customers", label: "Customers" },
  { id: "orders", label: "Orders" },
  { id: "services", label: "Services" },
  { id: "other", label: "Other" },
  { id: "starred", label: "Starred" },
  { id: "sent", label: "Sent" },
  { id: "archived", label: "Archived" },
  { id: "spam", label: "Spam" },
];

/** "Sweet'Oh Creations <hello@…>" — the address customers see on every reply. */
export function shopSender() {
  const from = getServerEnv().sweetohFromEmail;
  if (!from) return null;
  return { email: from.toLowerCase(), display: from.includes("<") ? from : `Sweet'Oh Creations <${from}>` };
}

async function findCustomer(ventureId: string, email: string) {
  const [row] = await getDb()
    .select({ id: customer.id, name: customer.name, orders: sql<number>`(select count(*)::int from "order" o where o.customer_id = "customer"."id")` })
    .from(customer)
    .where(and(eq(customer.ventureId, ventureId), sql`lower(${customer.email}) = ${email}`))
    .limit(1);
  return row ?? null;
}

/** Reply to a stored message (In-Reply-To), else the same person + subject within 60 days. */
async function findThread(ventureId: string, counterpart: string, subject: string, inReplyTo: string | null) {
  const db = getDb();
  if (inReplyTo) {
    const [hit] = await db
      .select({ threadId: inboxMessage.threadId })
      .from(inboxMessage)
      .where(and(eq(inboxMessage.ventureId, ventureId), eq(inboxMessage.messageId, inReplyTo)))
      .limit(1);
    if (hit) return hit.threadId;
  }
  const key = threadSubject(subject);
  const candidates = await db
    .select({ id: inboxThread.id, subject: inboxThread.subject })
    .from(inboxThread)
    .where(
      and(
        eq(inboxThread.ventureId, ventureId),
        eq(inboxThread.counterpartEmail, counterpart),
        sql`${inboxThread.lastMessageAt} > now() - interval '60 days'`,
      ),
    )
    .orderBy(desc(inboxThread.lastMessageAt))
    .limit(20);
  return candidates.find((t) => threadSubject(t.subject) === key)?.id ?? null;
}

function header(headers: Record<string, string> | null | undefined, name: string) {
  if (!headers) return null;
  const hit = Object.entries(headers).find(([k]) => k.toLowerCase() === name);
  return hit ? String(hit[1]) : null;
}

/**
 * Store one received email (idempotent on Resend's id — webhooks retry) and
 * forward it to the partner's Gmail. Returns the thread id.
 */
export async function ingestReceivedEmail(emailId: string): Promise<{ threadId: string; duplicate: boolean }> {
  const db = getDb();
  const [existing] = await db
    .select({ threadId: inboxMessage.threadId })
    .from(inboxMessage)
    .where(eq(inboxMessage.resendEmailId, emailId))
    .limit(1);
  if (existing) return { threadId: existing.threadId, duplicate: true };

  const [venture, email] = await Promise.all([getDefaultVenture(), getReceivedEmail(emailId)]);
  const sender = parseAddress(header(email.headers, "from") ?? email.from);
  const subject = (email.subject ?? "").trim() || "(no subject)";
  const inReplyTo = header(email.headers, "in-reply-to")?.trim() || null;
  const known = await findCustomer(venture.id, sender.email);
  const spam = looksLikeSpam(email.authentication);
  const category = categorize({
    fromEmail: sender.email,
    subject,
    text: email.text,
    knownCustomer: Boolean(known),
    customerHasOrders: (known?.orders ?? 0) > 0,
  });
  const attachments = (email.attachments ?? []).map((a) => ({
    id: a.id,
    filename: a.filename ?? null,
    contentType: a.content_type ?? null,
    size: a.size ?? null,
  }));
  const receivedAt = new Date(email.created_at);
  const snippet = snippetOf(email.text, email.html);

  const threadId = await db.transaction(async (tx) => {
    let id = await findThread(venture.id, sender.email, subject, inReplyTo);
    if (id) {
      await tx
        .update(inboxThread)
        .set({
          messageCount: sql`${inboxThread.messageCount} + 1`,
          lastMessageAt: receivedAt,
          unread: true,
          archivedAt: null,
          counterpartName: sql`coalesce(${inboxThread.counterpartName}, ${sender.name})`,
          customerId: sql`coalesce(${inboxThread.customerId}, ${known?.id ?? null}::uuid)`,
          updatedAt: new Date(),
        })
        .where(eq(inboxThread.id, id));
    } else {
      const [row] = await tx
        .insert(inboxThread)
        .values({
          ventureId: venture.id,
          subject,
          counterpartEmail: sender.email,
          counterpartName: sender.name,
          category,
          customerId: known?.id ?? null,
          messageCount: 1,
          lastMessageAt: receivedAt,
          spam,
        })
        .returning({ id: inboxThread.id });
      id = row.id;
    }
    await tx.insert(inboxMessage).values({
      ventureId: venture.id,
      threadId: id,
      direction: "in",
      resendEmailId: email.id,
      messageId: email.message_id ?? header(email.headers, "message-id"),
      inReplyTo,
      fromEmail: sender.email,
      fromName: sender.name,
      toEmails: email.to ?? [],
      ccEmails: email.cc ?? [],
      subject,
      textBody: email.text,
      htmlBody: email.html,
      snippet,
      attachments,
      authentication: email.authentication ?? null,
      createdAt: receivedAt,
    }).onConflictDoNothing();
    return id;
  });

  if (!spam) await forwardToPartner({ emailId: email.id, sender, subject, email }).catch((error) => {
    logger.error("inbox_forward_failed", { emailId, error: String(error) });
  });
  return { threadId, duplicate: false };
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/**
 * Copy to the partner's Gmail. Reply-To is the customer, so hitting Reply in
 * Gmail answers them directly; the OS inbox keeps the shop-address thread.
 */
async function forwardToPartner(input: {
  emailId: string;
  sender: { name: string | null; email: string };
  subject: string;
  email: Awaited<ReturnType<typeof getReceivedEmail>>;
}) {
  const env = getServerEnv();
  const to = env.sweetohPartnerInbox;
  const shop = shopSender();
  if (!to || !shop || !isSweetohEmailConfigured()) return;
  // Never forward to the shop's own domain (mail loop), or back to the person who wrote it.
  if (domainOf(to) === domainOf(shop.email) || to.toLowerCase() === input.sender.email) return;

  const files = input.email.attachments?.length ? await listReceivedAttachments(input.emailId).catch(() => []) : [];
  const who = input.sender.name ? `${input.sender.name} <${input.sender.email}>` : input.sender.email;
  const toLine = (input.email.to ?? []).join(", ");
  const inboxUrl = `${env.siteUrl.replace(/\/$/, "")}/partner/inbox`;
  const banner = `<div style="font:13px/1.5 system-ui,sans-serif;color:#1f6f6b;background:#e6f1ef;border-radius:10px;padding:10px 14px;margin:0 0 16px">
    <b>Sweet'Oh inbox</b> · ${escapeHtml(who)} wrote to ${escapeHtml(toLine)}.
    Reply here to answer them, or <a href="${inboxUrl}" style="color:#1f6f6b">reply from the shop</a> so it comes from your shop address.</div>`;
  const textBanner = `— Sweet'Oh inbox: ${who} wrote to ${toLine}. Reply to answer them. —\n\n`;

  const { error } = await getResendClient().emails.send({
    from: `"${(input.sender.name ?? input.sender.email).replace(/["\\\r\n]/g, "")} via Sweet'Oh" <${shop.email}>`,
    to,
    replyTo: who,
    subject: input.subject,
    html: banner + (input.email.html ?? `<pre style="white-space:pre-wrap;font:14px/1.5 system-ui,sans-serif">${escapeHtml(input.email.text ?? "")}</pre>`),
    text: textBanner + (input.email.text ?? ""),
    attachments: files
      .filter((f) => f.download_url)
      .map((f) => ({ path: f.download_url, filename: f.filename ?? "attachment" })),
  });
  await getDb()
    .update(inboxMessage)
    .set(error ? { forwardError: error.message.slice(0, 500) } : { forwardedAt: new Date(), forwardError: null })
    .where(eq(inboxMessage.resendEmailId, input.emailId));
  if (error) throw new Error(error.message);
}

function folderWhere(ventureId: string, folder: InboxFolder) {
  const base = eq(inboxThread.ventureId, ventureId);
  const live = and(base, isNull(inboxThread.archivedAt), eq(inboxThread.spam, false));
  switch (folder) {
    case "inbox":
      return live;
    case "starred":
      return and(base, eq(inboxThread.starred, true), eq(inboxThread.spam, false));
    case "archived":
      return and(base, isNotNull(inboxThread.archivedAt), eq(inboxThread.spam, false));
    case "spam":
      return and(base, eq(inboxThread.spam, true));
    case "sent":
      return and(
        base,
        sql`exists (select 1 from inbox_message m where m.thread_id = "inbox_thread"."id" and m.direction = 'out')`,
      );
    default:
      return and(live, eq(inboxThread.category, folder));
  }
}

export type InboxThreadRow = typeof inboxThread.$inferSelect & { snippet: string | null; lastDirection: "in" | "out" | null };

export async function listThreads(session: SessionUser, folder: InboxFolder, query?: string): Promise<InboxThreadRow[]> {
  const q = query?.trim();
  const search = q
    ? or(
        ilike(inboxThread.subject, `%${q}%`),
        ilike(inboxThread.counterpartEmail, `%${q}%`),
        ilike(inboxThread.counterpartName, `%${q}%`),
        sql`exists (select 1 from inbox_message m where m.thread_id = "inbox_thread"."id" and m.text_body ilike ${`%${q}%`})`,
      )
    : undefined;
  const rows = await getDb()
    .select({
      thread: inboxThread,
      snippet: sql<string | null>`(select m.snippet from inbox_message m where m.thread_id = "inbox_thread"."id" order by m.created_at desc limit 1)`,
      lastDirection: sql<"in" | "out" | null>`(select m.direction from inbox_message m where m.thread_id = "inbox_thread"."id" order by m.created_at desc limit 1)`,
    })
    .from(inboxThread)
    .where(and(folderWhere(session.ventureId, folder), search))
    .orderBy(desc(inboxThread.lastMessageAt))
    .limit(100);
  return rows.map((r) => ({ ...r.thread, snippet: r.snippet, lastDirection: r.lastDirection }));
}

/** Unread counts per shelf for the sidebar and the nav badge. */
export async function inboxCounts(ventureId: string) {
  const rows = await getDb()
    .select({ category: inboxThread.category, unread: count() })
    .from(inboxThread)
    .where(and(eq(inboxThread.ventureId, ventureId), eq(inboxThread.unread, true), isNull(inboxThread.archivedAt), eq(inboxThread.spam, false)))
    .groupBy(inboxThread.category);
  const byCategory = Object.fromEntries(rows.map((r) => [r.category, Number(r.unread)])) as Partial<Record<InboxCategory, number>>;
  const total = rows.reduce((sum, r) => sum + Number(r.unread), 0);
  return { total, byCategory };
}

export async function countUnread(ventureId: string) {
  return (await inboxCounts(ventureId)).total;
}

/** Newest few conversations for the home page. */
export async function latestThreads(ventureId: string, limit = 4) {
  return getDb()
    .select({
      thread: inboxThread,
      snippet: sql<string | null>`(select m.snippet from inbox_message m where m.thread_id = "inbox_thread"."id" order by m.created_at desc limit 1)`,
    })
    .from(inboxThread)
    .where(and(eq(inboxThread.ventureId, ventureId), isNull(inboxThread.archivedAt), eq(inboxThread.spam, false)))
    .orderBy(desc(inboxThread.lastMessageAt))
    .limit(limit);
}

async function ownThread(session: SessionUser, threadId: string) {
  const [thread] = await getDb()
    .select()
    .from(inboxThread)
    .where(and(eq(inboxThread.id, threadId), eq(inboxThread.ventureId, session.ventureId)))
    .limit(1);
  if (!thread) throw new NotFoundError("Conversation not found");
  return thread;
}

/** A thread with its messages and what the shop knows about the person. */
export async function getThread(session: SessionUser, threadId: string) {
  const thread = await ownThread(session, threadId);
  const db = getDb();
  const messages = await db
    .select()
    .from(inboxMessage)
    .where(eq(inboxMessage.threadId, thread.id))
    .orderBy(inboxMessage.createdAt);
  const person = thread.customerId
    ? { id: thread.customerId }
    : await findCustomer(session.ventureId, thread.counterpartEmail);
  const [orders, requests] = person
    ? await Promise.all([
        db
          .select({ id: order.id, totalCents: order.totalCents, status: order.status, createdAt: order.createdAt })
          .from(order)
          .where(eq(order.customerId, person.id))
          .orderBy(desc(order.createdAt))
          .limit(5),
        db
          .select({ id: customRequest.id, productType: customRequest.productType, status: customRequest.status, createdAt: customRequest.createdAt })
          .from(customRequest)
          .where(eq(customRequest.customerId, person.id))
          .orderBy(desc(customRequest.createdAt))
          .limit(5),
      ])
    : [[], []];
  if (thread.unread) {
    await db.update(inboxThread).set({ unread: false }).where(eq(inboxThread.id, thread.id));
  }
  return { thread: { ...thread, unread: false }, messages, customer: person ? { orders, requests } : null };
}

export async function updateThread(
  session: SessionUser,
  threadId: string,
  change: { starred?: boolean; archived?: boolean; spam?: boolean; unread?: boolean; category?: InboxCategory },
) {
  await ownThread(session, threadId);
  await getDb()
    .update(inboxThread)
    .set({
      ...(change.starred !== undefined && { starred: change.starred }),
      ...(change.archived !== undefined && { archivedAt: change.archived ? new Date() : null }),
      ...(change.spam !== undefined && { spam: change.spam }),
      ...(change.unread !== undefined && { unread: change.unread }),
      ...(change.category && { category: change.category }),
      updatedAt: new Date(),
    })
    .where(eq(inboxThread.id, threadId));
}

function textToHtml(text: string) {
  return `<div style="font:15px/1.6 system-ui,-apple-system,sans-serif;color:#241d14">${escapeHtml(text)
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 12px">${p.replace(/\n/g, "<br>")}</p>`)
    .join("")}</div>`;
}

/** Send from the shop's address. Replies thread with In-Reply-To/References. */
export async function sendFromShop(
  session: SessionUser,
  input: { threadId?: string; to?: string; subject?: string; body: string },
) {
  const shop = shopSender();
  if (!shop || !isSweetohEmailConfigured()) {
    throw new ValidationError("Shop email isn't switched on yet — the shop's sending address still needs to be set.");
  }
  const body = input.body.trim();
  if (!body) throw new ValidationError("Write a message first.");
  if (body.length > 20000) throw new ValidationError("That message is too long.");
  const db = getDb();

  let thread = input.threadId ? await ownThread(session, input.threadId) : null;
  const to = thread?.counterpartEmail ?? input.to?.trim().toLowerCase();
  if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) throw new ValidationError("Enter a valid email address.");
  const subject = thread ? replySubject(thread.subject) : (input.subject?.trim() || "A note from Sweet'Oh Creations");

  const history = thread
    ? await db
        .select({ messageId: inboxMessage.messageId })
        .from(inboxMessage)
        .where(and(eq(inboxMessage.threadId, thread.id), isNotNull(inboxMessage.messageId)))
        .orderBy(inboxMessage.createdAt)
    : [];
  const refs = history.map((h) => h.messageId!).filter(Boolean);
  const last = refs.at(-1);
  const domain = domainOf(shop.email) || "sweetohcreations.shop";
  const messageId = `<${crypto.randomUUID()}@${domain}>`;

  const { data, error } = await getResendClient().emails.send({
    from: shop.display,
    to,
    subject,
    text: body,
    html: textToHtml(body),
    headers: {
      "Message-ID": messageId,
      ...(last ? { "In-Reply-To": last, References: refs.slice(-10).join(" ") } : {}),
    },
  });
  if (error) {
    logger.error("inbox_send_failed", { error: error.message });
    throw new ValidationError(`Couldn't send: ${error.message}`);
  }

  if (!thread) {
    const known = await findCustomer(session.ventureId, to);
    [thread] = await db
      .insert(inboxThread)
      .values({
        ventureId: session.ventureId,
        subject,
        counterpartEmail: to,
        category: known ? "customers" : "other",
        customerId: known?.id ?? null,
        unread: false,
      })
      .returning();
  }
  await db.insert(inboxMessage).values({
    ventureId: session.ventureId,
    threadId: thread.id,
    direction: "out",
    resendEmailId: data?.id ? `out:${data.id}` : null,
    messageId,
    inReplyTo: last ?? null,
    fromEmail: shop.email,
    fromName: "Sweet'Oh Creations",
    toEmails: [to],
    subject,
    textBody: body,
    snippet: snippetOf(body),
    sentByUserId: session.appUser.id,
  });
  await db
    .update(inboxThread)
    .set({
      messageCount: sql`${inboxThread.messageCount} + 1`,
      lastMessageAt: new Date(),
      unread: false,
      archivedAt: null,
      updatedAt: new Date(),
    })
    .where(eq(inboxThread.id, thread.id));
  return thread.id;
}

/** Fresh download link for one attachment on a stored inbound message. */
export async function attachmentLink(session: SessionUser, messageId: string, attachmentId: string) {
  const [row] = await getDb()
    .select({ resendEmailId: inboxMessage.resendEmailId, attachments: inboxMessage.attachments })
    .from(inboxMessage)
    .where(and(eq(inboxMessage.id, messageId), eq(inboxMessage.ventureId, session.ventureId)))
    .limit(1);
  if (!row?.resendEmailId || !row.attachments.some((a) => a.id === attachmentId)) throw new NotFoundError("Attachment not found");
  return (await getReceivedAttachment(row.resendEmailId, attachmentId)).download_url;
}

