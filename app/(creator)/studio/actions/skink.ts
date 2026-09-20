"use server";

import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import { skinkVisitorUsage } from "@/lib/db/schema";
import { getSessionUser, requireCreator } from "@/lib/domains/identity/service";
import { getCreatorProfile, getCreditBalance, spendCredits } from "@/lib/domains/creator/credits";
import type { AiLevel } from "@/lib/domains/creator/plans";
import { runCreatorTurn, runVisitorTurn, type SkinkEvent } from "@/lib/domains/skink/agent";
import { appendMessages, createThread, deleteThread, listMessages } from "@/lib/domains/skink/threads";
import { forgetMemory, rememberFact, updateMemory, MEMORY_KINDS } from "@/lib/domains/skink/memory";
import { isAiConfigured } from "@/lib/ai/router";

export type SkinkResult =
  | { ok: true; reply: string; threadId: string; balance: number; credits: number; events: SkinkEvent[] }
  | { ok: false; error: string; code?: "credits" | "config" | "limit" | "auth" };

const VISITOR_DAILY_LIMIT = 12;

function friendly(error: unknown) {
  const status = (error as { status?: number })?.status;
  console.error("skink_failed", { status, message: error instanceof Error ? error.message : String(error) });
  if (status === 429) return "I'm getting a lot of questions right now — try again in a minute.";
  return "I couldn't answer that just now. Try again in a moment.";
}

/** Signed-in creators: memory, tools, metered credits, saved conversation. */
export async function sendSkinkMessage(input: { threadId?: string | null; message: string; level?: AiLevel }): Promise<SkinkResult> {
  const session = await getSessionUser();
  if (!session || session.role !== "creator") return { ok: false, error: "Sign in to chat with Skink.", code: "auth" };
  const message = z.string().trim().min(1).max(4000).safeParse(input.message);
  if (!message.success) return { ok: false, error: "Type a message first." };
  if (!isAiConfigured()) return { ok: false, error: "Sweet'Oh AI isn't switched on yet.", code: "config" };

  const [{ balance, plan }, profile] = await Promise.all([getCreditBalance(session.appUser.id), getCreatorProfile(session.appUser.id)]);
  const level: AiLevel = input.level && plan.levels.includes(input.level) ? input.level : plan.levels.includes("smart") ? "smart" : "light";
  if (balance < 0.2) return { ok: false, error: "You're out of credits for this month. Upgrade or top up to keep chatting with Skink.", code: "credits" };

  try {
    const thread = input.threadId ? { id: z.string().uuid().parse(input.threadId) } : await createThread(session.appUser.id, message.data);
    const history = input.threadId
      ? (await listMessages(session.appUser.id, thread.id)).map((m) => ({ role: m.role as "user" | "assistant", content: m.content }))
      : [];
    const result = await runCreatorTurn({ session, plan, level, history, message: message.data, balance, tools: profile?.tools });
    await spendCredits({
      userId: session.appUser.id,
      amount: result.credits,
      reason: "Skink chat",
      metadata: { models: result.models, level, threadId: thread.id },
      allowOverdraft: true,
    });
    await appendMessages(session.appUser.id, thread.id, [
      { role: "user", content: message.data },
      { role: "assistant", content: result.reply, metadata: { events: result.events, credits: result.credits, level } },
    ]);
    if (result.events.some((e) => e.tool === "remember" || e.tool === "forget")) revalidatePath("/studio/memory");
    return { ok: true, reply: result.reply, threadId: thread.id, balance: balance - result.credits, credits: result.credits, events: result.events };
  } catch (error) {
    return { ok: false, error: friendly(error) };
  }
}

/** Anyone on the storefront. Signed-in creators get their real Skink. */
export async function askSkink(input: { message: string; history?: { role: "user" | "assistant"; content: string }[]; threadId?: string | null }): Promise<SkinkResult> {
  const session = await getSessionUser();
  if (session?.role === "creator") return sendSkinkMessage({ threadId: input.threadId, message: input.message });
  const message = z.string().trim().min(1).max(1500).safeParse(input.message);
  if (!message.success) return { ok: false, error: "Ask me something!" };
  if (!isAiConfigured()) return { ok: false, error: "Sweet'Oh AI isn't switched on yet.", code: "config" };

  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
  const key = createHash("sha256").update(`skink:${ip}`).digest("hex").slice(0, 32);
  const day = new Date().toISOString().slice(0, 10);
  const [usage] = await getDb()
    .insert(skinkVisitorUsage)
    .values({ key, day, count: 1 })
    .onConflictDoUpdate({ target: [skinkVisitorUsage.key, skinkVisitorUsage.day], set: { count: sql`${skinkVisitorUsage.count} + 1` } })
    .returning({ count: skinkVisitorUsage.count });
  if ((usage?.count ?? 0) > VISITOR_DAILY_LIMIT) {
    return { ok: false, code: "limit", error: "That's today's free chats. Create a free account at /studio/join and I'll remember your brand and help you design." };
  }
  try {
    const history = (input.history ?? []).filter((t) => t.role === "user" || t.role === "assistant").slice(-10);
    const reply = await runVisitorTurn({ history, message: message.data });
    return { ok: true, reply, threadId: "", balance: 0, credits: 0, events: [] };
  } catch (error) {
    return { ok: false, error: friendly(error) };
  }
}

export async function loadThreadAction(threadId: string) {
  const session = await requireCreator();
  const rows = await listMessages(session.appUser.id, z.string().uuid().parse(threadId));
  return rows.map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
    events: ((m.metadata as { events?: SkinkEvent[] } | null)?.events ?? []) as SkinkEvent[],
  }));
}

export async function deleteThreadAction(threadId: string) {
  const session = await requireCreator();
  await deleteThread(session.appUser.id, z.string().uuid().parse(threadId));
  revalidatePath("/studio/skink");
}

/* ---------- Memory the creator edits directly ---------- */

export async function addMemoryAction(form: FormData): Promise<{ error?: string }> {
  const session = await requireCreator();
  const parsed = z
    .object({ kind: z.enum(MEMORY_KINDS), title: z.string().trim().min(1).max(120), body: z.string().trim().max(1200) })
    .safeParse({ kind: form.get("kind"), title: form.get("title"), body: form.get("body") ?? "" });
  if (!parsed.success) return { error: "Give the memory a short title." };
  await rememberFact(session.appUser.id, parsed.data, "creator");
  revalidatePath("/studio/memory");
  return {};
}

export async function updateMemoryAction(id: string, patch: { title?: string; body?: string; pinned?: boolean }): Promise<{ error?: string }> {
  const session = await requireCreator();
  try {
    await updateMemory(session.appUser.id, z.string().uuid().parse(id), patch);
  } catch {
    return { error: "Couldn't save that change." };
  }
  revalidatePath("/studio/memory");
  return {};
}

export async function forgetMemoryAction(id: string) {
  const session = await requireCreator();
  await forgetMemory(session.appUser.id, z.string().uuid().parse(id));
  revalidatePath("/studio/memory");
}
