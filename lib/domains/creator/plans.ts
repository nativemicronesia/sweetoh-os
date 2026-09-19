/**
 * Create with Sweet'Oh plans. Client-safe (no server imports) so the landing
 * page, plans page and server all read the same numbers.
 *
 * Credits = AI capacity. 1 credit ≈ $0.01 of raw provider cost, so heavier
 * models and image generation spend more; casual chat barely registers.
 */
export type PlanId = "free" | "creator" | "pro";
export type AiLevel = "light" | "smart" | "deep";

export type Plan = {
  id: PlanId;
  name: string;
  tagline: string;
  monthlyCents: number;
  /** Regular yearly price. */
  yearlyCents: number;
  /** Launch-only yearly price for the first FOUNDING_SPOTS creators. */
  foundingYearlyCents: number;
  monthlyCredits: number;
  levels: AiLevel[];
  savedDesigns: number | null;
  features: string[];
};

export const FOUNDING_SPOTS = 100;
export const TOPUP = { credits: 500, cents: 1000 } as const;

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: "free",
    name: "Free",
    tagline: "Try Sweet'Oh",
    monthlyCents: 0,
    yearlyCents: 0,
    foundingYearlyCents: 0,
    monthlyCredits: 50,
    levels: ["light"],
    savedDesigns: 10,
    features: [
      "Skink teaches you print-on-demand",
      "Design Studio + Printify catalog",
      "Save up to 10 designs",
      "Send products to your Printify store",
      "50 credits a month (about 10 AI designs)",
    ],
  },
  creator: {
    id: "creator",
    name: "Creator",
    tagline: "Everything you need to run a POD brand",
    monthlyCents: 2400,
    yearlyCents: 24000,
    foundingYearlyCents: 19900,
    monthlyCredits: 1000,
    levels: ["light", "smart"],
    savedDesigns: null,
    features: [
      "Skink on smart models: strategy, pricing, research",
      "Skink remembers your brand, goals and decisions",
      "Unlimited saved designs",
      "Send products to your Printify store",
      "Request prints from the Sweet'Oh shop",
      "1,000 credits a month (about 200 AI designs)",
    ],
  },
  pro: {
    id: "pro",
    name: "Pro",
    tagline: "The most capable Skink",
    monthlyCents: 7900,
    yearlyCents: 79000,
    foundingYearlyCents: 69900,
    monthlyCredits: 3500,
    levels: ["light", "smart", "deep"],
    savedDesigns: null,
    features: [
      "Everything in Creator",
      "Top models from Anthropic, OpenAI and Google",
      "Deep research: niches, competitors, product lines",
      "Premium image quality",
      "Choose Quick, Smart or Deep per message",
      "3,500 credits a month",
    ],
  },
};

export function planFor(id: string | null | undefined): Plan {
  return PLANS[(id as PlanId) in PLANS ? (id as PlanId) : "free"];
}

/** Credits charged for Studio AI actions (images are priced per action, not per token). */
export const ACTION_CREDITS = {
  design: 5,
  premiumDesign: 5,
  pattern: 5,
  edit: 5,
  cutout: 5,
  understand: 2,
  research: 10,
  blank: 5,
} as const;

export function actionCreditsForKey(key: string): number {
  const prefix = key.split(":")[0];
  if (prefix.startsWith("premium-")) return ACTION_CREDITS.premiumDesign;
  if (prefix === "art") return ACTION_CREDITS.design;
  if (prefix === "pattern") return ACTION_CREDITS.pattern;
  if (prefix === "edit") return ACTION_CREDITS.edit;
  if (prefix === "bg" || prefix === "blank-cutout") return ACTION_CREDITS.cutout;
  if (prefix === "blank-screen" || prefix === "blank-understand") return ACTION_CREDITS.understand;
  if (prefix === "blank") return ACTION_CREDITS.blank;
  // Photo research reservations use a bare sha256 fingerprint.
  return ACTION_CREDITS.research;
}

export function formatCredits(n: number): string {
  if (n >= 10) return Math.floor(n).toLocaleString("en-US");
  return (Math.floor(n * 10) / 10).toLocaleString("en-US");
}

export function formatUsd(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: cents % 100 ? 2 : 0 })}`;
}
