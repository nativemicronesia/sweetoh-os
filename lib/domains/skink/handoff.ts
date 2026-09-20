/**
 * Use what you already pay for.
 *
 * Sweet'Oh AI is the agent; the models, the Studio and the creator's OWN
 * subscriptions are all resources it knows how to use. When a creator already
 * pays for ChatGPT, Claude, Gemini, Canva (or anything else), Skink prepares
 * the exact prompt, context and instructions for that tool instead of spending
 * Sweet'Oh credits — then picks the workflow back up with whatever they bring
 * back.
 */
import type { Memory } from "./memory";

export type ToolId = "chatgpt" | "claude" | "gemini" | "copilot" | "canva" | "photoshop" | "capcut" | "printify" | "printful" | "etsy" | "shopify" | "other";

export type Tool = { id: ToolId; name: string; kind: "ai" | "design" | "production" | "store"; url: string; good: string };

export const TOOLS: Tool[] = [
  { id: "chatgpt", name: "ChatGPT", kind: "ai", url: "https://chatgpt.com", good: "writing, planning, images, deep research" },
  { id: "claude", name: "Claude", kind: "ai", url: "https://claude.ai", good: "strategy, long documents, careful thinking" },
  { id: "gemini", name: "Gemini", kind: "ai", url: "https://gemini.google.com", good: "research, trends, big-picture scans" },
  { id: "copilot", name: "Microsoft Copilot", kind: "ai", url: "https://copilot.microsoft.com", good: "everyday writing and images" },
  { id: "canva", name: "Canva", kind: "design", url: "https://canva.com", good: "layouts, mockups, social posts, brand kits" },
  { id: "photoshop", name: "Photoshop", kind: "design", url: "https://www.adobe.com/products/photoshop.html", good: "detailed image work and retouching" },
  { id: "capcut", name: "CapCut", kind: "design", url: "https://www.capcut.com", good: "short videos and product reels" },
  { id: "printify", name: "Printify", kind: "production", url: "https://printify.com", good: "printing and shipping your orders" },
  { id: "printful", name: "Printful", kind: "production", url: "https://www.printful.com", good: "printing and shipping your orders" },
  { id: "etsy", name: "Etsy", kind: "store", url: "https://www.etsy.com/sell", good: "a marketplace with built-in shoppers" },
  { id: "shopify", name: "Shopify", kind: "store", url: "https://www.shopify.com", good: "your own branded store" },
  { id: "other", name: "Something else", kind: "ai", url: "", good: "tell Skink what it is and he'll work with it" },
];

export const toolById = (id: string) => TOOLS.find((t) => t.id === id);

export type HandoffTask = {
  id: string;
  label: string;
  blurb: string;
  /** Which kinds of tool this task suits. */
  kinds: Tool["kind"][];
  /** What the creator types in, e.g. a product or a niche. */
  askFor: string;
  instructions: (brief: string) => string;
  /** How Skink files the result when it comes back. */
  memoryKind: "project" | "decision" | "fact" | "experiment";
};

export const HANDOFF_TASKS: HandoffTask[] = [
  {
    id: "niche",
    label: "Research a niche",
    blurb: "Who buys it, what sells, what to avoid.",
    kinds: ["ai"],
    askFor: "The niche or audience you're thinking about",
    memoryKind: "project",
    instructions: (b) => `Research this print-on-demand niche and report back:\n\nNICHE: ${b}\n\nCover:\n1. Who buys in this niche, and what they care about.\n2. 8 product ideas that sell in it (product type + design concept).\n3. What's oversaturated or risky, including trademark traps.\n4. Realistic price ranges on Etsy today.\n5. 10 search phrases buyers actually use.\n\nBe specific and current. Short bullets.`,
  },
  {
    id: "listing",
    label: "Write a product listing",
    blurb: "Title, description and tags for Etsy or Shopify.",
    kinds: ["ai"],
    askFor: "The product and who it's for",
    memoryKind: "decision",
    instructions: (b) => `Write a print-on-demand product listing.\n\nPRODUCT: ${b}\n\nGive me:\n1. Three title options under 140 characters, keyword-first.\n2. A description: hook, what it is, who it's for, print/care details, gift angle.\n3. 13 Etsy tags, each 20 characters or less.\n4. Five short bullet points for a Shopify page.\n\nNo trademarked terms. Plain, warm, human language.`,
  },
  {
    id: "design-brief",
    label: "Develop a design idea",
    blurb: "Turn a rough idea into a clear design brief you can make.",
    kinds: ["ai", "design"],
    askFor: "Your rough idea",
    memoryKind: "project",
    instructions: (b) => `Turn this into a print-ready design brief.\n\nIDEA: ${b}\n\nGive me:\n1. Three distinct design directions (concept, mood, motifs).\n2. For each: a colour palette (hex codes) and font style.\n3. Exact text/wording to use, if any.\n4. Composition notes for a chest print, roughly 12 x 14 inches.\n5. One image-generation prompt per direction, for standalone artwork on a transparent background — no product mockup, no logos, no copyrighted characters.`,
  },
  {
    id: "artwork",
    label: "Generate artwork",
    blurb: "Make the image in your own AI, then bring the file back.",
    kinds: ["ai", "design"],
    askFor: "What the artwork should show",
    memoryKind: "experiment",
    instructions: (b) => `Create standalone print artwork — not a product photo or mockup.\n\nBRIEF: ${b}\n\nRules: transparent background where possible, high contrast, no small text, nothing copyrighted or trademarked, square, as large as your tool allows (at least 2000 x 2000).\n\nThen export it as a PNG so I can upload it to my Sweet'Oh Studio.`,
  },
  {
    id: "plan",
    label: "Plan my product line",
    blurb: "What to make next, in order.",
    kinds: ["ai"],
    askFor: "Your brand and what you've made so far",
    memoryKind: "project",
    instructions: (b) => `Plan the next stage of my print-on-demand line.\n\nMY BRAND: ${b}\n\nGive me:\n1. Ten products to make next, in priority order (product type + design concept + who it's for).\n2. Why that order.\n3. What to test first and how I'll know it worked.\n4. What to skip, and why.`,
  },
  {
    id: "marketing",
    label: "Write my launch posts",
    blurb: "Social captions and a launch plan.",
    kinds: ["ai", "design"],
    askFor: "The product or drop you're launching",
    memoryKind: "decision",
    instructions: (b) => `Write launch content for this print-on-demand drop.\n\nDROP: ${b}\n\nGive me:\n1. Five Instagram/TikTok captions with hooks, in a warm, real voice.\n2. A seven-day posting plan.\n3. Three short video ideas I can film with my phone.\n4. A message I can send to family and friends without sounding like an ad.`,
  },
];

export const taskById = (id: string) => HANDOFF_TASKS.find((t) => t.id === id);

/** What Skink knows about this creator, compact enough to paste into another tool. */
export function brandContext(memories: Memory[], name: string | null) {
  const pick = (kinds: string[]) => memories.filter((m) => kinds.includes(m.kind)).slice(0, 12);
  const lines = pick(["brand", "goal", "preference", "decision", "project", "fact", "correction"]).map(
    (m) => `- ${m.title}${m.body ? `: ${m.body.replace(/\s+/g, " ").slice(0, 300)}` : ""}`,
  );
  return [`CREATOR: ${name ?? "(name not given)"}`, lines.length ? `WHAT MY BRAND IS ABOUT:\n${lines.join("\n")}` : "MY BRAND: still figuring it out."].join("\n\n");
}

/** The full pack a creator pastes into their own tool. */
export function buildHandoffPack(input: { tool: Tool; task: HandoffTask; brief: string; memories: Memory[]; name: string | null }) {
  return [
    `You're helping me with my print-on-demand business. I'm working inside Sweet'Oh Studio and I'll bring your answer back there.`,
    brandContext(input.memories, input.name),
    input.task.instructions(input.brief.trim()),
    `Keep it practical and ready to use. No preamble.`,
  ].join("\n\n---\n\n");
}
