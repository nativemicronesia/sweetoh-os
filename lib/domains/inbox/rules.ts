/**
 * Pure inbox rules — no DB, no network — so they're unit-tested in
 * scripts/verify-inbox.test.ts: webhook signature checks, address parsing,
 * which shelf an email goes on, and threading keys.
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import type { InboxCategory } from "@/lib/db/schema/inbox";

/**
 * Resend signs webhooks with Svix: HMAC-SHA256 over `${id}.${timestamp}.${body}`
 * keyed with the base64 part of the `whsec_…` secret. The header holds one or
 * more space-separated `v1,<base64sig>` entries. Rejects anything older than
 * five minutes so a captured request can't be replayed later.
 */
export function verifyWebhookSignature(input: {
  secret: string;
  id: string | null;
  timestamp: string | null;
  signature: string | null;
  body: string;
  nowSeconds?: number;
}): boolean {
  const { secret, id, timestamp, signature, body } = input;
  if (!id || !timestamp || !signature) return false;
  const ts = Number(timestamp);
  const now = input.nowSeconds ?? Math.floor(Date.now() / 1000);
  if (!Number.isFinite(ts) || Math.abs(now - ts) > 5 * 60) return false;
  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const expected = createHmac("sha256", key).update(`${id}.${timestamp}.${body}`).digest();
  return signature.split(" ").some((part) => {
    const [version, sig] = part.split(",");
    if (version !== "v1" || !sig) return false;
    const given = Buffer.from(sig, "base64");
    return given.length === expected.length && timingSafeEqual(given, expected);
  });
}

/** `"Maria Cruz" <maria@x.com>` → { name: "Maria Cruz", email: "maria@x.com" }. */
export function parseAddress(raw: string | null | undefined): { name: string | null; email: string } {
  const value = (raw ?? "").trim();
  const angled = value.match(/^(.*?)<([^>]+)>\s*$/);
  if (angled) {
    const name = angled[1].trim().replace(/^"|"$/g, "").trim();
    return { name: name || null, email: angled[2].trim().toLowerCase() };
  }
  return { name: null, email: value.toLowerCase() };
}

export function domainOf(email: string) {
  return email.split("@")[1]?.toLowerCase() ?? "";
}

/** Businesses the shop runs on — their mail goes on the "Services" shelf. */
const SERVICE_DOMAINS = [
  "stripe.com",
  "printify.com",
  "resend.com",
  "resend.dev",
  "vercel.com",
  "namecheap.com",
  "supabase.com",
  "supabase.io",
  "github.com",
  "google.com",
  "openai.com",
  "anthropic.com",
  "paypal.com",
  "squareup.com",
  "usps.com",
  "ups.com",
  "fedex.com",
  "dhl.com",
  "shippo.com",
  "pirateship.com",
  "canva.com",
  "etsy.com",
  "amazon.com",
  "facebookmail.com",
  "instagram.com",
];

function isServiceDomain(domain: string) {
  return SERVICE_DOMAINS.some((d) => domain === d || domain.endsWith(`.${d}`));
}

const ORDER_WORDS = /\b(order|ordered|tracking|shipped|delivery|deliver|refund|return|exchange|receipt|package)\b/i;
const NO_REPLY = /^(no-?reply|do-?not-?reply|notifications?|mailer-daemon|bounces?)[@+.]/i;

/**
 * Which shelf an email goes on. Customers the shop already knows win, then
 * businesses the shop uses, then anything that reads like an order question.
 */
export function categorize(input: {
  fromEmail: string;
  subject: string;
  text?: string | null;
  knownCustomer: boolean;
  customerHasOrders: boolean;
}): InboxCategory {
  const domain = domainOf(input.fromEmail);
  const words = `${input.subject}\n${(input.text ?? "").slice(0, 2000)}`;
  if (input.knownCustomer) return input.customerHasOrders && ORDER_WORDS.test(words) ? "orders" : "customers";
  if (isServiceDomain(domain) || NO_REPLY.test(input.fromEmail)) return "services";
  if (ORDER_WORDS.test(input.subject)) return "orders";
  // A real person writing to the shop from a personal address is a customer until proven otherwise.
  return "customers";
}

/** Failed SPF *and* DKIM, or a failed DMARC, is treated as spam. */
export function looksLikeSpam(auth: { spf?: string; dkim?: string; dmarc?: string } | null | undefined) {
  if (!auth) return false;
  if (auth.dmarc === "fail") return true;
  return auth.spf === "fail" && auth.dkim === "fail";
}

/** "RE: Fwd: re: Hello" → "hello", so replies land on the same thread. */
export function threadSubject(subject: string) {
  return subject
    .replace(/^(\s*(re|fw|fwd|aw|sv)\s*(\[\d+\])?\s*:\s*)+/i, "")
    .trim()
    .toLowerCase();
}

/** First ~160 readable characters, without quoted reply history. */
export function snippetOf(text: string | null | undefined, html?: string | null) {
  const source = text?.trim() ? text : (html ?? "").replace(/<style[\s\S]*?<\/style>|<script[\s\S]*?<\/script>/gi, "").replace(/<[^>]+>/g, " ");
  const withoutQuotes = source
    .split(/\r?\n/)
    .filter((line) => !line.trim().startsWith(">"))
    .join(" ")
    .split(/\bOn .{4,80} wrote:/)[0];
  const clean = withoutQuotes
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
  return clean.length > 160 ? `${clean.slice(0, 157).trimEnd()}…` : clean;
}

/** "Re: …" once, never "Re: Re: …". */
export function replySubject(subject: string) {
  return /^\s*re\s*:/i.test(subject) ? subject : `Re: ${subject}`;
}
