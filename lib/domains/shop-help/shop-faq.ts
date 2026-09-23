/**
 * Everything Skink says in the shop — edit freely. Plain text; keep answers
 * short, and never promise a time, price or policy the shop hasn't set.
 * `{supportEmail}` is filled in from SWEETOH_SUPPORT_EMAIL when it's set.
 */
type Link = { label: string; href: string };
type Entry = { answer: string; links?: Link[]; chips?: string[] };

export type FaqTopic =
  | "greeting"
  | "shipping"
  | "returns"
  | "custom"
  | "sizing"
  | "payment"
  | "contact"
  | "location"
  | "account"
  | "about"
  | "care"
  | "catalog"
  | "howToOrder"
  | "thanks"
  | "fallback";

export const SHOP_FAQ: Record<FaqTopic, Entry> = {
  greeting: {
    answer: "Håfa adai, Alii, Kamorale, Iakwe, Ekamawir omo, Mauri! I'm Skink, the shop's helper. I can help you find something, explain shipping and returns, check on your order, or get a custom request to the shop.",
    chips: ["Track my order", "Shipping", "Custom order", "What do you sell?"],
  },
  shipping: {
    answer: "Everything is made to order by our shop in Lacey, Washington, then shipped to the address you give at checkout. You'll see shipping options at checkout, and we email you when your order moves into production and when it ships. Availability can depend on the product and where you are — including the islands.",
    links: [{ label: "Shipping details", href: "/shipping" }],
    chips: ["Track my order", "Returns"],
  },
  returns: {
    answer: "Because each piece is made for you, we can't take back items for change of mind. If your order arrives damaged or wrong, contact us soon with your order details and a photo and we'll make it right.",
    links: [{ label: "Returns policy", href: "/returns" }],
    chips: ["Contact the shop", "Track my order"],
  },
  custom: {
    answer: "Yes — the shop makes custom pieces: your own design, names, a logo, or a batch for a team, family reunion or event. Create a free account, then send a custom request with what you want (photos help). The shop reviews it and emails you back. Nothing is made or charged until you both agree.",
    links: [{ label: "Send a custom request", href: "/custom" }],
    chips: ["Shipping", "What do you sell?"],
  },
  sizing: {
    answer: "Sizes are listed on each product page. If you're between sizes, say so in a custom request or contact the shop and they'll help you pick.",
    chips: ["Returns", "Contact the shop"],
  },
  payment: {
    answer: "Checkout is handled securely by Stripe — major cards and the wallets Stripe offers on your device.",
    chips: ["Shipping", "Track my order"],
  },
  contact: {
    answer: "The fastest way to reach the shop is a custom request (sign in first) — it goes straight to our inbox and we reply by email. You can also email {supportEmail}.",
    links: [{ label: "Send a request", href: "/custom" }],
    chips: ["Track my order", "Returns"],
  },
  location: {
    answer: "We're a Micronesian-owned print shop in Lacey, Washington. Orders ship from there; we'll share any local pickup options by email when they're available.",
    chips: ["Shipping", "About Sweet'Oh"],
  },
  account: {
    answer: "An account is free. It lets you send custom requests and lets me check on your orders. Use the same email you order with.",
    links: [
      { label: "Create an account", href: "/account" },
      { label: "Sign in", href: "/account?mode=login" },
    ],
    chips: ["Custom order", "Track my order"],
  },
  about: {
    answer: "Sweet'Oh Creations is a Micronesian-owned print shop in Lacey, Washington — creative apparel and gifts for every kind of person, made with care.",
    links: [{ label: "Shop", href: "/collections" }],
    chips: ["What do you sell?", "Custom order"],
  },
  care: {
    answer: "Care instructions are on each product page. For printed apparel, washing inside out in cold water and tumble drying low keeps prints looking fresh.",
    chips: ["Returns", "What do you sell?"],
  },
  catalog: {
    answer: "Apparel, drinkware, bags and gifts — all made to order by our shop. Tell me what you're looking for (like “hoodie” or “tumbler”) or browse everything.",
    links: [{ label: "Browse the shop", href: "/collections" }],
    chips: ["Custom order", "Shipping"],
  },
  howToOrder: {
    answer: "Find something you like in the shop, pick your options (like color and size), tap Add to cart, then Checkout. You'll get a confirmation email, and we'll email again when it's being made and when it ships.",
    links: [{ label: "Browse the shop", href: "/collections" }],
    chips: ["Shipping", "Custom order"],
  },
  thanks: {
    answer: "Anytime — thank you for shopping with us! 🌊",
    chips: ["What do you sell?", "Track my order"],
  },
  fallback: {
    answer: "I'm not sure about that one — I'm a simple shop helper. Try one of these, or send the shop a request and a real person will email you back.",
    links: [{ label: "Send a request", href: "/custom" }],
    chips: ["Track my order", "Shipping", "Returns", "What do you sell?"],
  },
};
