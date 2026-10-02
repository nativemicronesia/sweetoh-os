/**
 * Guided workflows. Skink turns a multi-step goal (launch a product, build a
 * collection, run a seasonal drop) into steps and, for each step, picks the
 * cheapest sensible place to do it: a tool the creator already pays for, Studio
 * when the job needs the real product, or Skink himself. Progress lives in the
 * creator's memory (no extra table), so it survives across chats.
 */
import { toolById, type ToolId } from "./handoff";
import { recommendFor, type Job, type Recommendation } from "./tool-knowledge";

export type WorkflowStep = { id: string; title: string; job: Job; outcome: string };
export type Workflow = { id: string; name: string; summary: string; steps: WorkflowStep[] };

const S = (id: string, title: string, job: Job, outcome: string): WorkflowStep => ({ id, title, job, outcome });

export const WORKFLOWS: Workflow[] = [
  {
    id: "first-product",
    name: "Launch your first product",
    summary: "From a niche idea to a product that is live in your store.",
    steps: [
      S("niche", "Choose a niche people buy in", "research", "One niche with a clear buyer"),
      S("idea", "Settle the design idea and brand look", "strategy", "A one-line concept, colors and tone"),
      S("artwork", "Make the artwork", "typography-art", "A transparent PNG or SVG"),
      S("fit", "Fit it to the product's print area", "print-fit", "Artwork placed and checked on the real product"),
      S("mockups", "Make product mockups", "mockups", "Photos for the listing"),
      S("listing", "Write the listing", "copy", "Title, description and tags"),
      S("fulfil", "Connect printing and shipping", "fulfilment", "A product your print provider can make"),
      S("sell", "Publish to your store", "sell", "The product is live"),
    ],
  },
  {
    id: "collection",
    name: "Build a collection",
    summary: "A small, consistent set of designs across several products.",
    steps: [
      S("niche", "Confirm the niche and audience", "research", "A buyer you can describe in a sentence"),
      S("concept", "Define the collection concept", "strategy", "A theme, palette and 5 to 8 design ideas"),
      S("artwork", "Make the hero artwork", "typography-art", "One strong design in your style"),
      S("variations", "Make the supporting designs", "image-generation", "The rest of the set, matching the hero"),
      S("apply", "Put the designs on several products", "many-products", "Each design placed correctly on each product"),
      S("mockups", "Make mockups", "mockups", "Photos for every product"),
      S("listing", "Write the listings", "copy", "Consistent titles and tags"),
      S("sell", "Publish the collection", "sell", "Products live in your store"),
    ],
  },
  {
    id: "seasonal-drop",
    name: "Run a seasonal drop",
    summary: "A timed release for a holiday or event, with a promo reel.",
    steps: [
      S("trends", "Scan what is rising for the season", "research", "A short list of themes to chase"),
      S("concept", "Pick the angle and a deadline", "strategy", "One theme and a date to publish by"),
      S("artwork", "Make the artwork", "typography-art", "Designs that fit the theme"),
      S("fit", "Fit it to the products", "print-fit", "Checked on the real print areas"),
      S("mockups", "Make mockups", "mockups", "Photos for listings and posts"),
      S("listing", "Write the listings", "copy", "Seasonal keywords in titles and tags"),
      S("sell", "Publish", "sell", "Products live before the deadline"),
      S("reel", "Make a short promo reel", "video", "A reel for social"),
    ],
  },
];

export const workflowById = (id: string) => WORKFLOWS.find((w) => w.id === id);

export type PlanStep = {
  id: string;
  title: string;
  outcome: string;
  done: boolean;
  where: Recommendation["where"];
  tool?: ToolId;
  toolName?: string;
  why: string;
};

export type Plan = { workflow: Workflow; goal: string; steps: PlanStep[]; next: PlanStep | null; ownToolSteps: number };

export function buildPlan(workflowId: string, mine: ToolId[], goal = "", done: string[] = []): Plan | null {
  const workflow = workflowById(workflowId);
  if (!workflow) return null;
  const steps = workflow.steps.map((step): PlanStep => {
    const rec = recommendFor(step.job, mine);
    return { id: step.id, title: step.title, outcome: step.outcome, done: done.includes(step.id), where: rec.where, tool: rec.tool, toolName: rec.tool ? toolById(rec.tool)?.name : undefined, why: rec.why };
  });
  return { workflow, goal, steps, next: steps.find((s) => !s.done) ?? null, ownToolSteps: steps.filter((s) => !s.done && s.where === "own-tool").length };
}

/** What is stored in memory: just the workflow, the goal and which steps are done. */
export const planTitle = (workflowId: string) => `Plan: ${workflowById(workflowId)?.name ?? workflowId}`;

export function encodePlan(workflowId: string, goal: string, done: string[]): string {
  const clean = goal.replace(/[;\n]+/g, ",").trim().slice(0, 300);
  return `wf=${workflowId}; goal=${clean}; done=${[...new Set(done)].join(",")}`;
}

export function parsePlanBody(body: string): { workflowId: string; goal: string; done: string[] } | null {
  const wf = /(?:^|;\s*)wf=([a-z-]+)/.exec(body)?.[1];
  if (!wf || !workflowById(wf)) return null;
  const goal = /;\s*goal=([^;]*)/.exec(body)?.[1]?.trim() ?? "";
  const doneText = /;\s*done=([^;]*)/.exec(body)?.[1] ?? "";
  const valid = new Set(workflowById(wf)!.steps.map((s) => s.id));
  return { workflowId: wf, goal, done: doneText.split(",").map((s) => s.trim()).filter((id) => valid.has(id)) };
}

/** Plain text Skink reads back: every step with where to do it, and what comes next. */
export function planText(plan: Plan): string {
  const place = (s: PlanStep) => (s.where === "own-tool" ? `in ${s.toolName} (you already have it, no credits)` : s.where === "studio" ? "in Studio (needs the real product)" : s.toolName ? `with Skink here (${s.toolName} suits it best if you get it)` : "with Skink here");
  const lines = plan.steps.map((s, i) => `${s.done ? "[done]" : "[ ]"} ${i + 1}. ${s.title}: ${place(s)}. Result: ${s.outcome}.`);
  const next = plan.next ? `NEXT STEP: ${plan.next.title} ${place(plan.next)}.` : "All steps are done.";
  return `${plan.workflow.name}${plan.goal ? ` (goal: ${plan.goal})` : ""}\n${lines.join("\n")}\n\n${next}${plan.ownToolSteps ? `\n${plan.ownToolSteps} remaining step${plan.ownToolSteps === 1 ? "" : "s"} can run in tools the creator already pays for.` : ""}`;
}
