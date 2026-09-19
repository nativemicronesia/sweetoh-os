import { and, desc, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import { creatorMemory } from "@/lib/db/schema";

/**
 * Durable private intelligence about one creator. Deliberately NOT chat
 * history: short, typed facts Skink (or the creator) chose to keep. Every
 * query is scoped to userId — memories are never shared between creators.
 */
export const MEMORY_KINDS = [
  "brand",
  "project",
  "goal",
  "preference",
  "decision",
  "asset",
  "experiment",
  "correction",
  "fact",
] as const;
export type MemoryKind = (typeof MEMORY_KINDS)[number];

export const MEMORY_KIND_LABEL: Record<MemoryKind, string> = {
  brand: "Brand",
  project: "Project",
  goal: "Goal",
  preference: "Preference",
  decision: "Decision",
  asset: "Asset",
  experiment: "Experiment",
  correction: "Correction",
  fact: "About me",
};

export const memoryInput = z.object({
  kind: z.enum(MEMORY_KINDS),
  title: z.string().trim().min(1).max(120),
  body: z.string().trim().max(1200).default(""),
});

export type Memory = typeof creatorMemory.$inferSelect;

export async function listMemories(userId: string, limit = 80): Promise<Memory[]> {
  return getDb()
    .select()
    .from(creatorMemory)
    .where(and(eq(creatorMemory.userId, userId), isNull(creatorMemory.archivedAt)))
    .orderBy(desc(creatorMemory.pinned), desc(creatorMemory.updatedAt))
    .limit(limit);
}

/** Same kind + title updates the existing memory instead of duplicating it. */
export async function rememberFact(
  userId: string,
  input: z.input<typeof memoryInput>,
  source: "skink" | "creator" = "skink",
): Promise<Memory> {
  const data = memoryInput.parse(input);
  const db = getDb();
  const existing = (await listMemories(userId, 200)).find(
    (m) => m.kind === data.kind && m.title.toLowerCase() === data.title.toLowerCase(),
  );
  if (existing) {
    const [row] = await db
      .update(creatorMemory)
      .set({ body: data.body, source, updatedAt: new Date() })
      .where(and(eq(creatorMemory.id, existing.id), eq(creatorMemory.userId, userId)))
      .returning();
    return row;
  }
  const [row] = await db
    .insert(creatorMemory)
    .values({ userId, kind: data.kind, title: data.title, body: data.body, source })
    .returning();
  return row;
}

export async function updateMemory(
  userId: string,
  id: string,
  patch: { title?: string; body?: string; kind?: MemoryKind; pinned?: boolean },
) {
  const clean = memoryInput.partial().extend({ pinned: z.boolean().optional() }).parse(patch);
  const [row] = await getDb()
    .update(creatorMemory)
    .set({ ...clean, source: "creator", updatedAt: new Date() })
    .where(and(eq(creatorMemory.id, id), eq(creatorMemory.userId, userId)))
    .returning();
  return row ?? null;
}

export async function forgetMemory(userId: string, id: string) {
  const [row] = await getDb()
    .update(creatorMemory)
    .set({ archivedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(creatorMemory.id, id), eq(creatorMemory.userId, userId)))
    .returning({ id: creatorMemory.id });
  return Boolean(row);
}

/** Compact block for Skink's system prompt. */
export function memoryPromptBlock(memories: Memory[]): string {
  if (!memories.length) return "You don't know anything durable about this creator yet. Learn their brand, goals and style as you go, and save what matters with the remember tool.";
  const lines = memories.slice(0, 60).map(
    (m) => `- [${m.kind}] (id ${m.id}) ${m.title}${m.body ? `: ${m.body.replace(/\s+/g, " ").slice(0, 400)}` : ""}`,
  );
  return `What you remember about this creator (their private memory — use it naturally, don't recite it):\n${lines.join("\n")}`;
}
