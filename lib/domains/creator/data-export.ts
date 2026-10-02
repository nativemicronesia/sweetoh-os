import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { asset, creatorMemory, creatorProfile, creditLedger, skinkMessage, skinkThread } from "@/lib/db/schema";
import type { SessionUser } from "@/lib/domains/identity/types";

/**
 * Everything the creator has given or made in Studio, as one JSON file they can keep.
 * Scoped to the signed-in person. Secrets (the encrypted Printify token, payment
 * identifiers) are never included.
 */
export async function buildCreatorExport(session: SessionUser) {
  const db = getDb();
  const userId = session.appUser.id;
  const [profile] = await db.select().from(creatorProfile).where(eq(creatorProfile.userId, userId)).limit(1);
  const memories = await db.select().from(creatorMemory).where(eq(creatorMemory.userId, userId)).orderBy(asc(creatorMemory.createdAt));
  const threads = await db.select().from(skinkThread).where(eq(skinkThread.userId, userId)).orderBy(asc(skinkThread.createdAt));
  const messages = threads.length ? await db.select().from(skinkMessage).where(inArray(skinkMessage.threadId, threads.map((t) => t.id))).orderBy(asc(skinkMessage.createdAt)) : [];
  const credits = await db.select().from(creditLedger).where(eq(creditLedger.userId, userId)).orderBy(desc(creditLedger.createdAt)).limit(2000);
  const designs = await db
    .select({ id: asset.id, name: asset.name, status: asset.status, notes: asset.notes, mimeType: asset.mimeType, createdAt: asset.createdAt, updatedAt: asset.updatedAt, composition: asset.compositionLayout })
    .from(asset)
    .where(and(eq(asset.ventureId, session.ventureId), eq(asset.uploadedById, userId), eq(asset.assetType, "sweetoh_design")))
    .orderBy(desc(asset.updatedAt))
    .limit(2000);

  return {
    exportedAt: new Date().toISOString(),
    about: "Your Sweet'Oh Studio data. It leaves out secrets such as your Printify token and payment identifiers. Image files are not inside this file; design layouts are, so your work can be rebuilt.",
    account: { name: session.appUser.name, email: session.appUser.email, role: session.role, memberSince: session.appUser.createdAt.toISOString() },
    plan: profile ? { plan: profile.plan, status: profile.planStatus, billingInterval: profile.billingInterval, founding: profile.founding, currentPeriodEnd: profile.currentPeriodEnd?.toISOString() ?? null } : null,
    tools: profile?.tools ?? [],
    printify: profile ? { connected: Boolean(profile.printifyTokenEnc), shopTitle: profile.printifyShopTitle } : null,
    memory: memories.map((m) => ({ kind: m.kind, title: m.title, body: m.body, pinned: m.pinned, source: m.source, archived: Boolean(m.archivedAt), createdAt: m.createdAt.toISOString(), updatedAt: m.updatedAt.toISOString() })),
    conversations: threads.map((t) => ({ title: t.title, createdAt: t.createdAt.toISOString(), messages: messages.filter((m) => m.threadId === t.id).map((m) => ({ role: m.role, content: m.content, at: m.createdAt.toISOString() })) })),
    credits: credits.map((c) => ({ amount: Number(c.delta), kind: c.kind, reason: c.reason, at: c.createdAt.toISOString() })),
    designs: designs.map((d) => ({ id: d.id, name: d.name, status: d.status, notes: d.notes, fileType: d.mimeType, createdAt: d.createdAt.toISOString(), updatedAt: d.updatedAt.toISOString(), layout: d.composition?.studio ?? null })),
  };
}
