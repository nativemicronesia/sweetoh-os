/**
 * Create with Sweet'Oh plans. Client-safe (no server imports) so the landing
 * page, plans page and server all read the same numbers.
 *
 * Credits = AI capacity. 1 credit ≈ $0.01 of raw provider cost, so heavier
 * models and image generation spend more; casual chat barely registers.
 */
export type PlanId = "free" | "creator" | "pro";
export type { AiLevel } from "@/lib/ai/router";
import type { AiLevel } from "@/lib/ai/router";

export type Plan = {
  id: PlanId;
  name: string;
  tagline: string;
  monthlyCents: number;
  /** Yearly price where offered (0 = monthly only). */
  yearlyCents: number;
  monthlyCredits: number;
  /** Credits per month during the free trial, when a plan has one. */
  trialCredits?: number;
  /** Free months before the first charge (card taken up front). */
  trialDays?: number;
  levels: AiLevel[];
  savedDesigns: number | null;
  features: string[];
};

export const TOPUP = { credits: 500, cents: 1000 } as const;

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: "free",
    name: "Free",
    tagline: "Try Sweet'Oh",
    monthlyCents: 0,
    yearlyCents: 0,
    monthlyCredits: 50,
    levels: ["light"],
    savedDesigns: 10,
    features: [
      "Meet Skink and see how Sweet'Oh AI works",
      "Creator Studio: design on real products",
      "Save up to 10 designs",
      "Send products to your own Printify store",
      "50 credits a month",
    ],
  },
  creator: {
    id: "creator",
    name: "Creator",
    tagline: "Sweet'Oh AI for your whole POD business",
    monthlyCents: 4900,
    yearlyCents: 0,
    monthlyCredits: 1500,
    trialCredits: 1000,
    trialDays: 90,
    levels: ["light", "smart"],
    savedDesigns: null,
    features: [
      "Skink helps you set up and run your POD business",
      "Store setup help: Printify, Etsy, Shopify and more",
      "Niche research, pricing, listings and product plans",
      "Remembers your brand, goals and decisions",
      "Unlimited saved designs",
      "Use your own ChatGPT / Claude / Gemini / Canva — no credits spent",
      "Request prints from the Sweet'Oh shop",
      "1,500 credits a month",
    ],
  },
  pro: {
    id: "pro",
    name: "Pro",
    tagline: "The most capable Sweet'Oh AI",
    monthlyCents: 11100,
    yearlyCents: 66600,
    monthlyCredits: 3500,
    levels: ["light", "smart", "deep"],
    savedDesigns: null,
    features: [
      "Everything in Creator",
      "OpenAI's most capable model for deep work",
      "Deep research: niches, competitors, product lines",
      "Premium image quality",
      "Choose Quick, Smart or Deep per task",
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
