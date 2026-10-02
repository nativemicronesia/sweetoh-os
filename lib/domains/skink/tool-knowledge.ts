/**
 * What Skink knows about the tools creators already use.
 *
 * Sweet'Oh does not replace these tools. Skink meets creators in them, tells
 * them which tool is best for a job, gives steps that actually work there, and
 * brings the result back into Studio when Studio is the better place (real
 * print areas, many products at once, mockups, selling). Everything here is
 * practical, durable guidance: no prices, fees or policy numbers, because those
 * change. Skink must tell people to confirm current plans and limits on the
 * tool's own site.
 *
 * Every entry carries `reviewBy`; a test fails once a date passes, which forces
 * a human review of this file instead of letting it go quietly stale.
 */
import type { Tool, ToolId } from "./handoff";

export type Recipe = {
  id: string;
  title: string;
  goal: string;
  steps: string[];
};

export type ExportAdvice = {
  /** Best file for print-on-demand artwork out of this tool. */
  format: string;
  /** Things to set before exporting so the file lands correctly in Studio. */
  settings: string[];
};

export type ToolKnowledge = {
  id: ToolId;
  strengths: string[];
  limits: string[];
  recipes: Recipe[];
  /** For design tools: how to export so Studio can use the file. */
  exportAdvice?: ExportAdvice;
  /** When Skink should send the creator back to Studio instead. */
  bringBack: string;
  /** What to double-check on the tool's own site, because it changes. */
  confirmOnSite: string[];
  reviewBy: string;
};

const REVIEW = "2027-04-01";

export const TOOL_KNOWLEDGE: ToolKnowledge[] = [
  {
    id: "canva",
    strengths: ["Fast layouts, social posts and listing graphics", "Huge template and stock library", "Brand kits and easy collaboration", "Everyone already knows it"],
    limits: ["Not built for deep typography or vector editing", "Transparent PNG and SVG export usually need a paid plan", "Print-area accuracy is up to you: it does not know the product"],
    recipes: [
      { id: "tee-art", title: "Print-ready artwork for a product", goal: "A design that fits a real print area", steps: ["In Studio, open the product and note the print area size in pixels.", "In Canva choose Custom size and enter exactly those pixels (or the same proportions).", "Turn off any background so the artwork sits on transparent.", "Keep text and key artwork inside the print area with a small margin.", "Download as PNG with a transparent background.", "Bring it into Studio and place it on the product; Studio checks resolution and fit."] },
      { id: "listing-images", title: "Listing and social images", goal: "Marketing graphics for a shop", steps: ["Use your brand colors and fonts from your brand kit.", "Start from a template sized for the platform.", "Use the product mockups Studio or your store generates as the photos.", "Export PNG or JPG at the platform's recommended size."] },
    ],
    exportAdvice: { format: "PNG with transparent background (SVG if the plan allows and the design is flat)", settings: ["Custom size in pixels matching the print area", "Transparent background on", "No bleed or crop marks", "Keep artwork inside the print area"] },
    bringBack: "Bring it to Studio to fit it to the real print area, apply it to several products at once, recolor for each garment color, make mockups, and send it to your store.",
    confirmOnSite: ["Which plan includes transparent PNG and SVG export", "The maximum custom size"],
    reviewBy: REVIEW,
  },
  {
    id: "kittl",
    strengths: ["Typography and text effects", "Vector-style badges, logos and merch artwork", "Merch-focused templates", "SVG, PDF and PNG export"],
    limits: ["AI features are billed by usage, so watch how much you spend", "Steeper learning curve than Canva", "Print areas are not product-aware: size it yourself"],
    recipes: [
      { id: "badge", title: "A badge or logo lockup for apparel", goal: "A sharp, print-ready emblem", steps: ["In Studio note the print area size for your product.", "In Kittl start from a badge or label template, or a blank project at that size.", "Edit the text, apply a text effect, and keep everything inside the print area.", "Export a transparent PNG at full size, or SVG if you want a vector file.", "Bring it into Studio and place it on the product."] },
      { id: "type-poster", title: "A type-led poster or quote print", goal: "Typography-first art", steps: ["Start a project at the poster's pixel size.", "Pick fonts that contrast (one display, one quiet).", "Use shape or curve warps for the headline.", "Export PNG (print size) and bring it to Studio for mockups."] },
    ],
    exportAdvice: { format: "Transparent PNG at full print size (SVG for flat vector artwork)", settings: ["Project sized to the print area in pixels", "Transparent background", "Export at the largest size for sharp printing", "Check the license on your plan covers selling products"] },
    bringBack: "Bring it to Studio for exact print-area placement, applying one design to many products, garment recoloring, mockups, and listing.",
    confirmOnSite: ["Whether your plan's license allows commercial product sales", "How AI usage is billed on your plan"],
    reviewBy: REVIEW,
  },
  {
    id: "photoshop",
    strengths: ["Detailed retouching and compositing", "Precise masks and color work", "Raster artwork at very high resolution"],
    limits: ["Heavy to learn and to run", "Not product-aware", "Subscription cost"],
    recipes: [{ id: "cleanup", title: "Clean up an image for print", goal: "A sharp image on transparent", steps: ["Cut out the subject and clean edges.", "Set the document to the print area size at 300 PPI.", "Export PNG with transparency.", "Bring it to Studio for placement and checks."] }],
    exportAdvice: { format: "PNG with transparency at 300 PPI", settings: ["300 PPI at the print area size", "sRGB color", "Transparent background", "Flatten effects that Studio cannot edit"] },
    bringBack: "Studio fits the file to the product's real print area and warns about resolution before you order.",
    confirmOnSite: ["Current plan and pricing"],
    reviewBy: REVIEW,
  },
  {
    id: "capcut",
    strengths: ["Short product videos and reels", "Quick captions and templates"],
    limits: ["Video only", "Not for print artwork"],
    recipes: [{ id: "reel", title: "A product reel", goal: "A short video for social", steps: ["Use mockups or photos of the product.", "Add 3 to 5 clips with captions.", "Export vertical for reels and shorts."] }],
    bringBack: "Studio makes the product mockups to feed your video.",
    confirmOnSite: ["Export limits on your plan"],
    reviewBy: REVIEW,
  },
  {
    id: "printify",
    strengths: ["Print and ship on demand through many print providers", "Large catalog", "Connects to Etsy and Shopify"],
    limits: ["Print areas differ by product and provider", "Quality and speed depend on the provider you choose", "Its mockups do not replace checking the print area"],
    recipes: [{ id: "fulfil", title: "Connect a design to a fulfilled product", goal: "A product ready to sell", steps: ["Pick a product and a provider with the quality and ship times you want.", "Use the exact print area size for your artwork.", "Upload the design, check placement on every print area.", "Connect your store and publish."] }],
    bringBack: "Studio sets up the artwork on the real print areas, checks it, and sends the product to Printify.",
    confirmOnSite: ["Provider pricing and ship times", "The exact print file requirements for the product"],
    reviewBy: REVIEW,
  },
  {
    id: "printful",
    strengths: ["Print and ship on demand with its own production", "Consistent quality control", "Connects to major stores"],
    limits: ["Often higher base prices", "Print areas differ by product"],
    recipes: [{ id: "fulfil", title: "Prepare artwork for Printful", goal: "Correct print files", steps: ["Open the product's file guide and note the size.", "Create the artwork at that size.", "Upload and check the placement preview.", "Connect your store and publish."] }],
    bringBack: "Studio prepares correctly sized artwork you can upload there.",
    confirmOnSite: ["File requirements for the product", "Pricing and ship times"],
    reviewBy: REVIEW,
  },
  {
    id: "etsy",
    strengths: ["A marketplace with built-in shoppers", "Strong search for gifts and niche products"],
    limits: ["Competition and fees apply", "Listing rules and AI-disclosure rules change", "Your shop standing depends on following them"],
    recipes: [{ id: "listing", title: "A listing that can be found", goal: "Title, tags and photos", steps: ["Lead the title with the main search phrase.", "Use all tags with real shopper phrases.", "Use clear mockups as the first photos.", "Check the marketplace's current rules on production partners and AI disclosure before publishing."] }],
    bringBack: "Studio makes the mockups and Skink drafts the listing text.",
    confirmOnSite: ["Current fees", "Current rules on production partners and AI-made work"],
    reviewBy: REVIEW,
  },
  {
    id: "shopify",
    strengths: ["Your own branded store and customer list", "Flexible checkout and apps"],
    limits: ["You bring the traffic", "Monthly cost and apps add up"],
    recipes: [{ id: "launch", title: "Launch a small branded store", goal: "A store with a few strong products", steps: ["Start with a handful of products in one niche.", "Connect your print provider.", "Write clear product pages with mockups.", "Set shipping and policies before announcing."] }],
    bringBack: "Studio builds the products and mockups; Skink helps with the copy and the niche.",
    confirmOnSite: ["Plan pricing", "Payment and tax setup in your region"],
    reviewBy: REVIEW,
  },
  {
    id: "chatgpt",
    strengths: ["Writing, planning and research", "Image generation", "Fast iteration on ideas"],
    limits: ["Does not know your print areas", "Generated images need checking for resolution and rights", "May state things confidently that are wrong"],
    recipes: [{ id: "ideas", title: "Design ideas and listing copy", goal: "Concepts and words you can use", steps: ["Paste Skink's prepared brief.", "Ask for several options, then pick one.", "For images, check size, edges and any text for errors.", "Bring the result back here."] }],
    bringBack: "Studio checks resolution, fits the image to the print area, and turns it into products.",
    confirmOnSite: ["Image generation limits on your plan"],
    reviewBy: REVIEW,
  },
  {
    id: "claude",
    strengths: ["Strategy, long documents and careful reasoning", "Planning a niche, pricing or a launch"],
    limits: ["No print-area awareness", "Verify any numbers or policies it quotes"],
    recipes: [{ id: "strategy", title: "A niche and pricing plan", goal: "A plan with trade-offs", steps: ["Paste Skink's prepared brief with your brand context.", "Ask for the plan and the risks.", "Bring the decisions back to be saved to your memory."] }],
    bringBack: "Skink files the decisions in your memory and Studio turns them into products.",
    confirmOnSite: ["Usage limits on your plan"],
    reviewBy: REVIEW,
  },
  {
    id: "gemini",
    strengths: ["Research and trend scans", "Summarizing a lot of material"],
    limits: ["Verify sources and numbers", "No print-area awareness"],
    recipes: [{ id: "trends", title: "A trend scan", goal: "What is rising in a niche", steps: ["Paste Skink's prepared brief.", "Ask for sources.", "Bring the findings back to be saved."] }],
    bringBack: "Skink saves the findings and Studio turns the ideas into designs.",
    confirmOnSite: ["Usage limits on your plan"],
    reviewBy: REVIEW,
  },
  {
    id: "copilot",
    strengths: ["Everyday writing and images inside Microsoft apps"],
    limits: ["No print-area awareness"],
    recipes: [{ id: "copy", title: "Draft listing copy", goal: "Readable product text", steps: ["Paste Skink's prepared brief.", "Edit the result into your voice.", "Bring it back to save."] }],
    bringBack: "Studio handles the artwork and products.",
    confirmOnSite: ["Image generation limits"],
    reviewBy: REVIEW,
  },
];

export const knowledgeFor = (id: string) => TOOL_KNOWLEDGE.find((k) => k.id === id);

export type Job = "typography-art" | "layout-graphics" | "photo-edit" | "research" | "strategy" | "copy" | "image-generation" | "print-fit" | "many-products" | "mockups" | "fulfilment" | "sell" | "video";

/** Which tool kinds suit a job, best first. Studio handles the jobs only it can. */
const BEST: Record<Job, ToolId[]> = {
  "typography-art": ["kittl", "canva", "photoshop"],
  "layout-graphics": ["canva", "kittl"],
  "photo-edit": ["photoshop", "canva"],
  research: ["gemini", "chatgpt", "claude"],
  strategy: ["claude", "chatgpt", "gemini"],
  copy: ["chatgpt", "claude", "copilot"],
  "image-generation": ["chatgpt", "gemini", "copilot"],
  "print-fit": [],
  "many-products": [],
  mockups: [],
  fulfilment: ["printify", "printful"],
  sell: ["etsy", "shopify"],
  video: ["capcut"],
};

export type Recommendation = { where: "own-tool" | "studio" | "skink"; tool?: ToolId; why: string };

/**
 * Cheapest sensible place for a job: a tool the creator already has first;
 * Studio only for what needs the real product; otherwise Skink himself.
 */
export function recommendFor(job: Job, mine: ToolId[]): Recommendation {
  const studioOnly: Job[] = ["print-fit", "many-products", "mockups"];
  if (studioOnly.includes(job)) return { where: "studio", why: "This needs the real print area and product, which only Studio knows." };
  const own = BEST[job].find((id) => mine.includes(id));
  if (own) return { where: "own-tool", tool: own, why: "You already have it, so this costs no Sweet'Oh credits." };
  const fallback = BEST[job][0];
  return fallback
    ? { where: "skink", tool: fallback, why: `${fallback} suits this best; if you don't have it, Skink can do a lighter version here.` }
    : { where: "skink", why: "Skink can handle this directly." };
}

/** The plain-text brief Skink gets when asked about a tool. Stays short on purpose. */
export function guideText(id: string, goal?: string): string | null {
  const k = knowledgeFor(id);
  if (!k) return null;
  const lines = [
    `Strengths: ${k.strengths.join("; ")}.`,
    `Limits: ${k.limits.join("; ")}.`,
  ];
  const g = goal?.toLowerCase().trim();
  const recipe = (g && k.recipes.find((r) => `${r.title} ${r.goal}`.toLowerCase().split(/\W+/).some((w) => w.length > 3 && g.includes(w)))) ?? k.recipes[0];
  if (recipe) lines.push(`Steps — ${recipe.title}:\n${recipe.steps.map((step, i) => `${i + 1}. ${step}`).join("\n")}`);
  if (k.exportAdvice) lines.push(`Export for Studio: ${k.exportAdvice.format}. ${k.exportAdvice.settings.join("; ")}.`);
  lines.push(`Bring it back to Studio when: ${k.bringBack}`);
  lines.push(`Tell the creator to confirm on the tool's own site: ${k.confirmOnSite.join("; ")}. Do not quote prices, fees or policy numbers.`);
  return lines.join("\n\n");
}

export type { Tool };
