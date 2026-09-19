import { and, asc, desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { skinkMessage, skinkThread } from "@/lib/db/schema";
import { NotFoundError } from "@/lib/shared/errors";

/** Conversation storage — separate from durable memory (see ./memory.ts). */
export type SkinkTurn = { role: "user" | "assistant"; content: string };

export async function listThreads(userId: string, limit = 30) {
  return getDb()
    .select()
    .from(skinkThread)
    .where(eq(skinkThread.userId, userId))
    .orderBy(desc(skinkThread.updatedAt))
    .limit(limit);
}

export async function getThread(userId: string, threadId: string) {
  const [row] = await getDb()
    .select()
    .from(skinkThread)
    .where(and(eq(skinkThread.id, threadId), eq(skinkThread.userId, userId)))
    .limit(1);
  if (!row) throw new NotFoundError("Conversation not found.");
  return row;
}

export async function createThread(userId: string, firstMessage: string) {
  const title = firstMessage.replace(/\s+/g, " ").trim().slice(0, 60) || "New chat";
  const [row] = await getDb().insert(skinkThread).values({ userId, title }).returning();
  return row;
}

export async function listMessages(userId: string, threadId: string, limit = 200) {
  await getThread(userId, threadId);
  return getDb()
    .select()
    .from(skinkMessage)
    .where(eq(skinkMessage.threadId, threadId))
    .orderBy(asc(skinkMessage.createdAt))
    .limit(limit);
}

export async function appendMessages(
  userId: string,
  threadId: string,
  turns: (SkinkTurn & { metadata?: Record<string, unknown> })[],
) {
  await getThread(userId, threadId);
  const db = getDb();
  const base = Date.now();
  await db.insert(skinkMessage).values(
    turns.map((t, i) => ({
      threadId,
      role: t.role,
      content: t.content,
      metadata: t.metadata ?? null,
      // Keep ordering stable when both turns land in the same millisecond.
      createdAt: new Date(base + i),
    })),
  );
  await db.update(skinkThread).set({ updatedAt: new Date() }).where(eq(skinkThread.id, threadId));
}

export async function deleteThread(userId: string, threadId: string) {
  await getDb().delete(skinkThread).where(and(eq(skinkThread.id, threadId), eq(skinkThread.userId, userId)));
}
