import { and, desc, eq, inArray, or, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { fulfillmentJob, order, orderLineItem, product } from "@/lib/db/schema";
import type { ShopCustomer } from "@/lib/domains/customers/account";
import { formatPrice } from "@/lib/shared/format";
import { getSweetohSupportEmail } from "@/lib/config/env";
import { SHOP_FAQ, type FaqTopic } from "./shop-faq";

/**
 * Skink in the shop — free to run. No AI model is called: questions are
 * matched to the shop's own answers (./shop-faq.ts), its live product list,
 * and, for signed-in customers, their own orders. Anything it can't answer
 * goes to a custom request or the shop's contact details.
 */
export type HelpLink = { label: string; href: string };
export type HelpAnswer = { text: string; links: HelpLink[]; chips: string[] };

export const STARTER_CHIPS = ["Track my order", "Shipping", "Returns", "Custom order", "What do you sell?"];

const has = (text: string, words: string[]) => words.some((w) => new RegExp(`\\b${w}`, "i").test(text));

function fromFaq(topic: FaqTopic): HelpAnswer {
  const entry = SHOP_FAQ[topic];
  const text = entry.answer.replace("{supportEmail}", getSweetohSupportEmail() ?? "the address in your order email");
  return { text, links: entry.links ?? [], chips: entry.chips ?? [] };
}

const ORDER_WORDS = ["order", "track", "tracking", "where('?s| is) my", "package", "parcel", "shipped yet"];

export async function answerShopQuestion(input: {
  message: string;
  ventureId: string;
  customer: ShopCustomer | null;
}): Promise<HelpAnswer> {
  const text = input.message.trim().slice(0, 500);
  if (!text) return fromFaq("greeting");

  if (has(text, ["place an order", "how (do|to|can) (i )?(place an )?order", "how (do|to|can) (i )?buy", "how does (it|ordering) work"])) {
    return fromFaq("howToOrder");
  }
  // Their own orders first — the most valuable thing Skink knows.
  if (has(text, ORDER_WORDS) && !has(text, ["custom order"])) {
    return ordersAnswer(input.ventureId, input.customer);
  }
  if (has(text, ["custom", "personali[sz]", "my own design", "logo", "bulk", "team", "event", "reunion", "wedding", "birthday", "request", "made for"])) {
    return fromFaq("custom");
  }
  if (has(text, ["ship", "delivery", "how long", "when will", "turnaround", "international", "guam", "hawaii", "fsm", "chuuk", "pohnpei", "yap", "kosrae", "palau", "marshall", "saipan"])) {
    return fromFaq("shipping");
  }
  if (has(text, ["return", "refund", "exchange", "damaged", "broken", "wrong", "defect"])) return fromFaq("returns");
  if (has(text, ["size", "sizing", "fit", "measure"])) return fromFaq("sizing");
  if (has(text, ["pay", "card", "apple pay", "paypal", "cash", "afterpay"])) return fromFaq("payment");
  if (has(text, ["contact", "email", "phone", "call", "talk to", "human", "person", "someone"])) return fromFaq("contact");
  if (has(text, ["pick ?up", "local", "where are you", "location", "lacey", "washington", "store near"])) return fromFaq("location");
  if (has(text, ["account", "sign ?up", "log ?in", "sign ?in", "password", "register"])) return fromFaq("account");
  if (has(text, ["who are you", "about", "micronesian", "owned", "your story", "what is sweet"])) return fromFaq("about");
  if (has(text, ["care", "wash", "dry", "dishwasher", "microwave"])) return fromFaq("care");
  if (has(text, ["thank", "thanks", "mahalo", "kalahngan", "si yu'os", "kinisou", "kommol"])) return fromFaq("thanks");
  if (has(text, ["^hi", "^hello", "^hey", "hafa", "kaselehlie", "ran allim", "iakwe", "alii"])) return fromFaq("greeting");

  const products = await findProducts(input.ventureId, text);
  if (products) return products;
  const kind = PRODUCT_KINDS.find((k) => new RegExp(`\\b${k}`, "i").test(text));
  if (kind) {
    return {
      text: `I don't see ${kind === "kids" ? "kids' pieces" : `a ${kind.replace(/s$/, "")}`} in the shop right now — new pieces are added often. You can browse what's there, or ask the shop to make one for you.`,
      links: [
        { label: "Browse the shop", href: "/collections" },
        { label: "Request a custom one", href: "/custom" },
      ],
      chips: ["Custom order", "Shipping"],
    };
  }
  if (has(text, ["sell", "products", "catalog", "what do you (have|make)", "shop", "browse", "price", "cost", "how much"])) {
    return fromFaq("catalog");
  }
  return fromFaq("fallback");
}

async function findProducts(ventureId: string, text: string): Promise<HelpAnswer | null> {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9' ]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w))
    .map((w) => w.replace(/s$/, ""));
  if (!words.length) return null;
  const rows = await getDb()
    .select({ name: product.name, slug: product.slug, priceCents: product.priceCents, category: product.category })
    .from(product)
    .where(and(eq(product.ventureId, ventureId), eq(product.active, true)))
    .orderBy(desc(product.updatedAt))
    .limit(300);
  const scored = rows
    .map((row) => {
      const hay = `${row.name} ${row.category}`.toLowerCase();
      return { row, score: words.filter((w) => hay.includes(w)).length };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);
  if (!scored.length) return null;
  return {
    text:
      scored.length === 1
        ? `Here's what I found: ${scored[0].row.name} — ${formatPrice(scored[0].row.priceCents)}.`
        : `Here's what I found in the shop:\n${scored.map(({ row }) => `• ${row.name} — ${formatPrice(row.priceCents)}`).join("\n")}`,
    links: scored.map(({ row }) => ({ label: row.name, href: `/products/${row.slug}` })),
    chips: ["Shipping", "Custom order"],
  };
}

const PRODUCT_KINDS = ["t-shirt", "tee", "shirt", "hoodie", "sweatshirt", "sweater", "tumbler", "mug", "cup", "bottle", "tote", "bag", "hat", "cap", "beanie", "onesie", "bodysuit", "kids", "baby", "sticker", "pillow", "blanket", "towel", "apron", "poster", "print"];

const STOP_WORDS = new Set(["the", "and", "for", "you", "your", "have", "any", "with", "what", "want", "need", "like", "can", "get", "some", "that", "this", "are", "there", "looking", "buy", "about", "show", "one", "more", "please", "does", "not", "how", "much"]);

const JOB_LABEL: Record<string, string> = {
  new: "Received — getting ready for production",
  in_production: "Being made",
  ready_to_ship: "Made — packing to ship",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

async function ordersAnswer(ventureId: string, shopper: ShopCustomer | null): Promise<HelpAnswer> {
  if (!shopper) {
    return {
      text: "I can check your orders once you're signed in with the email you ordered with. You can also find everything in your order confirmation email.",
      links: [
        { label: "Sign in", href: "/account?mode=login&next=/" },
        { label: "Create an account", href: "/account?next=/" },
      ],
      chips: ["Shipping", "Returns"],
    };
  }
  if (!shopper.emailVerifiedAt) {
    return {
      text: `To keep order details private, I can only show them once you confirm your email. I sent a confirmation link to ${shopper.email} when you signed up — tap it, then ask me again. Your order confirmation email has everything in the meantime.`,
      links: [{ label: "Send the link again", href: "/account/verify/resend" }],
      chips: ["Shipping", "Custom order"],
    };
  }
  const orders = await getDb()
    .select()
    .from(order)
    .where(
      and(
        eq(order.ventureId, ventureId),
        or(eq(order.customerId, shopper.id), sql`lower(${order.customerEmail}) = ${shopper.email.toLowerCase()}`),
        inArray(order.status, ["paid", "refunded"]),
      ),
    )
    .orderBy(desc(order.createdAt))
    .limit(5);
  if (!orders.length) {
    return {
      text: `I don't see any orders for ${shopper.email} yet. If you ordered with a different email, check that email's confirmation — or ask the shop and they'll look it up.`,
      links: [{ label: "Shop", href: "/collections" }],
      chips: ["Contact the shop", "Shipping"],
    };
  }
  const ids = orders.map((o) => o.id);
  const [items, jobs] = await Promise.all([
    getDb().select().from(orderLineItem).where(inArray(orderLineItem.orderId, ids)),
    getDb().select().from(fulfillmentJob).where(inArray(fulfillmentJob.orderId, ids)),
  ]);
  const links: HelpLink[] = [];
  const lines = orders.map((o) => {
    const mine = items.filter((i) => i.orderId === o.id);
    const oJobs = jobs.filter((j) => j.orderId === o.id);
    const what = mine.map((i) => `${i.quantity > 1 ? `${i.quantity}× ` : ""}${i.productName}`).join(", ") || "Your order";
    const date = o.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    let status = o.status === "refunded" ? "Refunded" : "Received — getting ready for production";
    if (oJobs.length) {
      // The furthest-behind item is the honest status of the whole order.
      const order_ = ["cancelled", "new", "in_production", "ready_to_ship", "shipped", "delivered"];
      const slowest = oJobs.filter((j) => j.status !== "cancelled").sort((a, b) => order_.indexOf(a.status) - order_.indexOf(b.status))[0] ?? oJobs[0];
      status = JOB_LABEL[slowest.status] ?? status;
      const tracked = oJobs.find((j) => j.trackingUrl || j.trackingNumber);
      if (tracked?.trackingUrl) links.push({ label: `Track ${date} order`, href: tracked.trackingUrl });
      else if (tracked?.trackingNumber) status += ` · tracking ${tracked.trackingNumber}`;
    }
    return `• ${date} — ${what} (${formatPrice(o.totalCents)}): ${status}`;
  });
  return {
    text: `Here are your latest orders, ${shopper.name?.split(" ")[0] ?? "friend"}:\n${lines.join("\n")}`,
    links,
    chips: ["Shipping", "Returns", "Contact the shop"],
  };
}
