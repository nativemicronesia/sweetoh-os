/**
 * Sweet'Oh AI's own abilities for the partner — memory, research, careful
 * reasoning, catalog search — next to the shop tools in ./tools.ts.
 *
 * Research and reasoning are separate Dekaz jobs (lib/ai/router.ts), both on
 * OpenAI. The partner is never metered — it's her shop.
 */

import { listPrintifyBlueprints } from "@/lib/integrations/printify/catalog";
import { jobParams, resolveModel, runWithFallback, tokenLimit, type AiJob, type AiLevel } from "@/lib/ai/router";
import type { SessionUser } from "@/lib/domains/identity/types";
import { forgetMemory, rememberFact, MEMORY_KINDS } from "@/lib/domains/skink/memory";
import type { ConversationTool } from "./tools";

/** Partner turns get the smart tier. */
const LEVEL: AiLevel = "smart";

async function askJob(job: AiJob, system: string, prompt: string) {
  return runWithFallback(resolveModel(job, LEVEL), async (resolved) => {
    const res = await resolved.client.chat.completions.create({
      model: resolved.model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt },
      ],
      ...tokenLimit(resolved, 1800),
      ...jobParams(resolved),
    });
    return res.choices[0]?.message?.content?.trim() || "";
  });
}

function text(input: Record<string, unknown>, key: string, max: number) {
  const value = input[key];
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export function buildSkinkPartnerTools(session: SessionUser, memoryBlock: string): ConversationTool[] {
  const userId = session.appUser.id;
  return [
    {
      name: "remember",
      description: "Save one durable fact about the shop or the partner to Sweet'Oh AI's private memory.",
      input_schema: {
        type: "object",
        properties: {
          kind: { type: "string", enum: [...MEMORY_KINDS] },
          title: { type: "string", description: "Short label, e.g. 'Best seller' or 'Pricing rule'" },
          body: { type: "string", description: "The fact itself, one or two sentences." },
        },
        required: ["kind", "title", "body"],
      },
      async execute(input) {
        const kind = MEMORY_KINDS.find((k) => k === input.kind) ?? "fact";
        const title = text(input, "title", 120);
        if (!title) return { ok: false, summary: "Couldn't save that memory." };
        const memory = await rememberFact(userId, { kind, title, body: text(input, "body", 1200) });
        return { ok: true, summary: `Remembered: ${memory.title}`, data: { id: memory.id } };
      },
    },
    {
      name: "forget",
      description: "Remove a memory the partner asked you to forget, by its id.",
      input_schema: { type: "object", properties: { id: { type: "string" } }, required: ["id"] },
      async execute(input) {
        const ok = await forgetMemory(userId, text(input, "id", 64)).catch(() => false);
        return { ok, summary: ok ? "Forgot that." : "No memory with that id." };
      },
    },
    {
      name: "find_products",
      description: "Search the Printify blank catalog the shop designs on.",
      input_schema: {
        type: "object",
        properties: { query: { type: "string", description: "e.g. 'hoodie', 'mug', 'kids tee', 'tote'" } },
        required: ["query"],
      },
      async execute(input) {
        const query = text(input, "query", 200).toLowerCase();
        const words = query.split(/\s+/).filter(Boolean);
        const rows = await listPrintifyBlueprints().catch(() => []);
        const hits = rows
          .filter((b) => words.every((w) => `${b.title} ${b.brand} ${b.model}`.toLowerCase().includes(w.replace(/s$/, ""))))
          .slice(0, 8)
          .map((b) => ({ title: b.title, maker: [b.brand, b.model].filter(Boolean).join(" "), link: `/partner/catalog/printify-${b.id}` }));
        return hits.length
          ? { ok: true, summary: `Found ${hits.length} products for “${query}”`, data: hits }
          : { ok: false, summary: `No catalog products matched “${query}”` };
      },
    },
    {
      name: "research",
      description: "Research current market questions: niches, trends, competitors, what sells, marketplace rules, supplier questions.",
      input_schema: { type: "object", properties: { question: { type: "string" } }, required: ["question"] },
      async execute(input) {
        const answer = await askJob(
          "research",
          "You are a print-on-demand and small print-shop market researcher. Answer with current, specific, practical findings. Flag uncertainty and anything that varies by marketplace or region. Be concise: bullet points, under 250 words.",
          text(input, "question", 1500),
        );
        return { ok: Boolean(answer), summary: "Researched it", data: answer || "No answer came back." };
      },
    },
    {
      name: "think_it_through",
      description: "Careful reasoning for pricing, strategy, product-line plans, or decisions with trade-offs.",
      input_schema: {
        type: "object",
        properties: { question: { type: "string" }, context: { type: "string", description: "Relevant facts to consider." } },
        required: ["question"],
      },
      async execute(input) {
        const question = text(input, "question", 2000);
        const context = text(input, "context", 3000);
        const answer = await askJob(
          "reason",
          `You are a senior advisor to the owner of a small Micronesian-owned print shop. Reason carefully, weigh trade-offs, and end with a clear recommendation and next step. Under 300 words.\n\n${memoryBlock}`,
          context ? `${question}\n\nContext:\n${context}` : question,
        );
        return { ok: Boolean(answer), summary: "Thought it through", data: answer || "No answer came back." };
      },
    },
  ];
}
