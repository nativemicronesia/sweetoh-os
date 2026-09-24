import Link from "next/link";
import {
  Archive,
  ArchiveRestore,
  ArrowLeft,
  Inbox as InboxIcon,
  MailOpen,
  Paperclip,
  PenSquare,
  Search,
  ShieldAlert,
  ShieldCheck,
  Star,
} from "lucide-react";
import { getServerEnv, isSweetohEmailConfigured } from "@/lib/config/env";
import type { InboxCategory } from "@/lib/db/schema";
import { requirePartnerWorkspace } from "@/lib/domains/identity/service";
import { getThread, inboxCounts, INBOX_FOLDERS, listThreads, shopSender, type InboxFolder } from "@/lib/domains/inbox/service";
import { NotFoundError } from "@/lib/shared/errors";
import { formatPrice } from "@/lib/shared/format";
import { threadAction } from "../actions/inbox";
import { EmailFrame } from "./email-frame";
import { NewMessageForm, ReplyBox } from "./reply-box";

export const metadata = { title: "Inbox" };

const CATEGORY_LABEL: Record<InboxCategory, string> = {
  customers: "Customer",
  orders: "Order",
  services: "Service",
  other: "Other",
};

/** The shop is in Lacey, WA — show times there, not in the server's UTC. */
const TZ = "America/Los_Angeles";
const dayKey = (d: Date) => d.toLocaleDateString("en-US", { timeZone: TZ });

function when(date: Date, long = false) {
  const now = new Date();
  const time = date.toLocaleTimeString("en-US", { timeZone: TZ, hour: "numeric", minute: "2-digit" });
  if (!long && dayKey(date) === dayKey(now)) return time;
  const sameYear = date.toLocaleDateString("en-US", { timeZone: TZ, year: "numeric" }) === now.toLocaleDateString("en-US", { timeZone: TZ, year: "numeric" });
  const day = date.toLocaleDateString("en-US", {
    timeZone: TZ,
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
    ...(long ? { weekday: "short" } : {}),
  });
  return long ? `${day}, ${time}` : day;
}

function initials(name: string | null, email: string) {
  const parts = (name ?? email.split("@")[0]).split(/[\s._-]+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "?") + (parts[1]?.[0] ?? "")).toUpperCase();
}

function href(params: { folder?: string; q?: string; t?: string; compose?: string }) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v && !(k === "folder" && v === "inbox")) sp.set(k, v);
  const s = sp.toString();
  return `/partner/inbox${s ? `?${s}` : ""}`;
}

function ThreadButton({ threadId, op, label, back, children }: { threadId: string; op: string; label: string; back?: string; children: React.ReactNode }) {
  return (
    <form action={threadAction}>
      <input type="hidden" name="threadId" value={threadId} />
      <input type="hidden" name="op" value={op} />
      {back && <input type="hidden" name="back" value={back} />}
      <button type="submit" className="pf-icon-btn" aria-label={label} title={label}>
        {children}
      </button>
    </form>
  );
}

export default async function InboxPage({
  searchParams,
}: {
  searchParams: Promise<{ folder?: string; q?: string; t?: string; compose?: string; to?: string }>;
}) {
  const session = await requirePartnerWorkspace();
  const sp = await searchParams;
  const folder = (INBOX_FOLDERS.some((f) => f.id === sp.folder) ? sp.folder : "inbox") as InboxFolder;
  const q = sp.q?.slice(0, 120);
  // Open the thread first: that marks it read, so the list and counts below are already up to date.
  const open = sp.t
    ? await getThread(session, sp.t).catch((error) => {
        if (error instanceof NotFoundError) return null;
        throw error;
      })
    : null;
  const [threads, counts] = await Promise.all([listThreads(session, folder, q), inboxCounts(session.ventureId)]);
  const env = getServerEnv();
  const shop = shopSender();
  const canSend = Boolean(shop) && isSweetohEmailConfigured();
  const receiving = Boolean(env.resendWebhookSecret);
  const address = shop?.email ?? "hello@sweetohcreations.shop";
  const back = href({ folder, q });
  const composing = sp.compose === "1";
  const showReader = Boolean(open) || composing;

  return (
    <div className="ib-page">
      <header className="ib-head">
        <div>
          <p className="studio-kicker">Your shop&apos;s mail</p>
          <h1 className="so-display">Inbox</h1>
          <p className="ib-sub">
            Everything sent to <b>@{address.split("@")[1]}</b> (like {address}), sorted for you.
            {env.sweetohPartnerInbox && <> A copy also lands in {env.sweetohPartnerInbox}.</>}
          </p>
        </div>
        <div className="ib-head-actions">
          <span className="ib-status" data-on={receiving}>
            <i aria-hidden /> {receiving ? "Receiving mail" : "Not connected yet"}
          </span>
          <Link href={href({ folder, q, compose: "1" })} className="pf-btn pf-btn-primary">
            <PenSquare size={15} /> New message
          </Link>
        </div>
      </header>

      <div className="ib" data-reading={showReader}>
        <nav className="ib-shelves" aria-label="Inbox folders">
          {INBOX_FOLDERS.map((f) => {
            const unread =
              f.id === "inbox" ? counts.total : (counts.byCategory[f.id as InboxCategory] ?? 0);
            return (
              <Link
                key={f.id}
                href={href({ folder: f.id })}
                aria-current={folder === f.id ? "page" : undefined}
                data-shelf={f.id}
              >
                <i aria-hidden />
                <span>{f.label}</span>
                {unread > 0 && ["inbox", "customers", "orders", "services", "other"].includes(f.id) && <b>{unread}</b>}
              </Link>
            );
          })}
        </nav>

        <section className="ib-list" aria-label="Conversations">
          <form className="ib-search" action="/partner/inbox">
            {folder !== "inbox" && <input type="hidden" name="folder" value={folder} />}
            <Search size={15} aria-hidden />
            <input name="q" defaultValue={q} placeholder="Search names, subjects, words…" aria-label="Search mail" />
          </form>
          {threads.length === 0 ? (
            <div className="ib-empty">
              <span className="so-pattern-layer" style={{ ["--pattern-ink" as string]: "rgba(31,111,107,.12)" }} />
              <InboxIcon size={30} strokeWidth={1.5} />
              <strong>{q ? "Nothing matches that." : "Calm seas."}</strong>
              <p>{q ? "Try a name or another word." : folder === "inbox" ? `When someone writes to ${address}, it shows up here.` : "Nothing on this shelf right now."}</p>
            </div>
          ) : (
            <ul>
              {threads.map((t) => (
                <li key={t.id}>
                  <Link
                    href={href({ folder, q, t: t.id })}
                    className="ib-row"
                    data-unread={t.unread}
                    aria-current={open?.thread.id === t.id ? "true" : undefined}
                  >
                    <span className="ib-avatar" data-shelf={t.category}>
                      {initials(t.counterpartName, t.counterpartEmail)}
                    </span>
                    <span className="ib-row-main">
                      <span className="ib-row-top">
                        <strong>{t.counterpartName ?? t.counterpartEmail}</strong>
                        <time>{when(t.lastMessageAt)}</time>
                      </span>
                      <span className="ib-row-subject">
                        {t.starred && <Star size={12} fill="currentColor" aria-label="Starred" />}
                        {t.subject}
                        {t.messageCount > 1 && <em>{t.messageCount}</em>}
                      </span>
                      <span className="ib-row-snippet">
                        {t.lastDirection === "out" && <b>You: </b>}
                        {t.snippet}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="ib-reader" aria-label="Message">
          {composing ? (
            <div className="ib-reader-inner">
              <Link href={back} className="ib-back">
                <ArrowLeft size={16} /> Back
              </Link>
              <h2 className="so-display ib-subject">New message</h2>
              <p className="ib-sub">From {shop?.display ?? address}</p>
              <NewMessageForm canSend={canSend} to={sp.to} />
            </div>
          ) : open ? (
            <div className="ib-reader-inner">
              <div className="ib-reader-bar">
                <Link href={back} className="ib-back">
                  <ArrowLeft size={16} /> Back
                </Link>
                <div className="ib-tools">
                  <ThreadButton threadId={open.thread.id} op={open.thread.starred ? "unstar" : "star"} label={open.thread.starred ? "Unstar" : "Star"}>
                    <Star size={17} fill={open.thread.starred ? "currentColor" : "none"} />
                  </ThreadButton>
                  <ThreadButton threadId={open.thread.id} op="unread" label="Mark unread" back={back}>
                    <MailOpen size={17} />
                  </ThreadButton>
                  {open.thread.archivedAt ? (
                    <ThreadButton threadId={open.thread.id} op="unarchive" label="Move back to inbox">
                      <ArchiveRestore size={17} />
                    </ThreadButton>
                  ) : (
                    <ThreadButton threadId={open.thread.id} op="archive" label="Archive" back={back}>
                      <Archive size={17} />
                    </ThreadButton>
                  )}
                  {open.thread.spam ? (
                    <ThreadButton threadId={open.thread.id} op="notspam" label="Not spam">
                      <ShieldCheck size={17} />
                    </ThreadButton>
                  ) : (
                    <ThreadButton threadId={open.thread.id} op="spam" label="Spam" back={back}>
                      <ShieldAlert size={17} />
                    </ThreadButton>
                  )}
                </div>
              </div>

              <h2 className="so-display ib-subject">{open.thread.subject}</h2>
              <div className="ib-person">
                <span className="ib-avatar ib-avatar-lg" data-shelf={open.thread.category}>
                  {initials(open.thread.counterpartName, open.thread.counterpartEmail)}
                </span>
                <div>
                  <strong>{open.thread.counterpartName ?? open.thread.counterpartEmail}</strong>
                  <span>{open.thread.counterpartEmail}</span>
                </div>
                <form action={threadAction} className="ib-move">
                  <input type="hidden" name="threadId" value={open.thread.id} />
                  <input type="hidden" name="op" value="move" />
                  <label>
                    <span className="sr-only">Shelf</span>
                    <select name="category" defaultValue={open.thread.category}>
                      {(Object.keys(CATEGORY_LABEL) as InboxCategory[]).map((c) => (
                        <option key={c} value={c}>
                          {CATEGORY_LABEL[c]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button type="submit" className="ib-link">Move</button>
                </form>
              </div>

              {open.customer && (open.customer.orders.length > 0 || open.customer.requests.length > 0) && (
                <aside className="ib-customer">
                  <strong>Shop customer</strong>
                  <ul>
                    {open.customer.orders.map((o) => (
                      <li key={o.id}>
                        Order · {formatPrice(o.totalCents)} · {o.status} · {when(o.createdAt)}
                      </li>
                    ))}
                    {open.customer.requests.map((r) => (
                      <li key={r.id}>
                        <Link href={`/partner/custom-requests#${r.id}`}>
                          Custom request · {r.productType} · {r.status}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </aside>
              )}

              <ol className="ib-messages">
                {open.messages.map((m) => (
                  <li key={m.id} className="ib-message" data-dir={m.direction}>
                    <header>
                      <strong>{m.direction === "out" ? "You" : (m.fromName ?? m.fromEmail)}</strong>
                      <span>{m.direction === "out" ? `from ${m.fromEmail}` : `to ${m.toEmails.join(", ")}`}</span>
                      <time>{when(m.createdAt, true)}</time>
                    </header>
                    {m.direction === "in" && m.htmlBody ? (
                      <EmailFrame html={m.htmlBody} />
                    ) : (
                      <div className="ib-text">{m.textBody ?? m.snippet}</div>
                    )}
                    {m.attachments.length > 0 && (
                      <div className="ib-files">
                        {m.attachments.map((a) => (
                          <a key={a.id} href={`/partner/inbox/file?m=${m.id}&a=${a.id}`} target="_blank" rel="noopener noreferrer">
                            <Paperclip size={13} /> {a.filename ?? "Attachment"}
                          </a>
                        ))}
                      </div>
                    )}
                    {m.direction === "in" && m.forwardedAt && <p className="ib-note">Copied to your Gmail</p>}
                  </li>
                ))}
              </ol>

              <ReplyBox
                threadId={open.thread.id}
                firstName={open.thread.counterpartName?.split(" ")[0] ?? null}
                canSend={canSend}
              />
            </div>
          ) : (
            <div className="ib-reader-empty">
              <span className="so-pattern-layer" style={{ ["--pattern-ink" as string]: "rgba(36,29,20,.06)" }} />
              <p className="so-display">Pick a conversation.</p>
              <span>Replies go out from {address}, so customers never see your personal email.</span>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
