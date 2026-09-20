"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import { creatorProfile } from "@/lib/db/schema";
import { requireCreator } from "@/lib/domains/identity/service";
import { listMemories, rememberFact } from "@/lib/domains/skink/memory";
import { buildHandoffPack, taskById, toolById, TOOLS } from "@/lib/domains/skink/handoff";

export async function saveToolsAction(ids: string[]): Promise<{ ok: boolean }> {
  const session = await requireCreator();
  const clean = z.array(z.string().max(30)).max(20).parse(ids).filter((id) => TOOLS.some((t) => t.id === id));
  await getDb().update(creatorProfile).set({ tools: clean, updatedAt: new Date() }).where(eq(creatorProfile.userId, session.appUser.id));
  revalidatePath("/studio/tools");
  revalidatePath("/studio");
  return { ok: true };
}

/** Builds the prompt + context pack for the creator's own tool. Costs no credits. */
export async function buildPackAction(input: { toolId: string; taskId: string; brief: string }): Promise<{ ok: true; pack: string; url: string } | { ok: false; error: string }> {
  const session = await requireCreator();
  const tool = toolById(input.toolId);
  const task = taskById(input.taskId);
  if (!tool || !task) return { ok: false, error: "Pick a tool and what you want done." };
  const brief = input.brief.trim();
  if (brief.length < 3) return { ok: false, error: `Tell Skink: ${task.askFor.toLowerCase()}.` };
  const memories = await listMemories(session.appUser.id);
  return { ok: true, pack: buildHandoffPack({ tool, task, brief, memories, name: session.appUser.name }), url: tool.url };
}

/** The creator pastes the result back; Skink files it in their memory. Costs no credits. */
export async function saveResultAction(input: { taskId: string; toolId: string; title: string; result: string }): Promise<{ ok: boolean; error?: string }> {
  const session = await requireCreator();
  const task = taskById(input.taskId);
  const tool = toolById(input.toolId);
  const result = input.result.trim();
  if (!task || !result) return { ok: false, error: "Paste what your tool gave you." };
  await rememberFact(
    session.appUser.id,
    {
      kind: task.memoryKind,
      title: (input.title.trim() || `${task.label} — ${new Date().toLocaleDateString()}`).slice(0, 120),
      body: `From ${tool?.name ?? "my own AI"}:\n${result}`.slice(0, 1200),
    },
    "creator",
  );
  revalidatePath("/studio/memory");
  revalidatePath("/studio/tools");
  return { ok: true };
}
