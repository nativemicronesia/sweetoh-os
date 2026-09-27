import { and, desc, eq, like } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { asset, partnerFeedback, partnerInspiration } from "@/lib/db/schema";
import type { SessionUser } from "@/lib/domains/identity/types";
import { validateImageUpload } from "@/lib/domains/assets/service";
import { createSignedUrl, uploadToBucket } from "@/lib/storage/client";
import { STORAGE_BUCKETS } from "@/lib/storage/paths";
import { ValidationError } from "@/lib/shared/errors";
import { randomUUID } from "node:crypto";

const safeName = (name: string) => name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-120) || "reference-image";

export async function savePartnerInspiration(session: SessionUser, input: {
  bytes: Buffer; name: string; mimeType: string; note?: string;
}) {
  validateImageUpload({ mimeType: input.mimeType, sizeBytes: input.bytes.length });
  const id = randomUUID();
  const objectKey = `${session.ventureSlug}/inspiration/${id}/${safeName(input.name)}`;
  await uploadToBucket({ bucket: STORAGE_BUCKETS.customerUploads, objectKey, body: input.bytes, contentType: input.mimeType });
  const [row] = await getDb().insert(partnerInspiration).values({
    id, ventureId: session.ventureId, uploadedById: session.appUser.id, objectKey,
    originalName: input.name.slice(0, 240), mimeType: input.mimeType,
    note: input.note?.trim().slice(0, 1000) || null,
  }).returning();
  return { id: row.id, name: row.originalName, note: row.note, createdAt: row.createdAt,
    previewUrl: await createSignedUrl({ bucket: STORAGE_BUCKETS.customerUploads, objectKey: row.objectKey }) };
}

export async function listPartnerInspiration(session: SessionUser) {
  const db = getDb();
  const rows = await db.select().from(partnerInspiration)
    .where(eq(partnerInspiration.ventureId, session.ventureId))
    .orderBy(desc(partnerInspiration.createdAt)).limit(100);
  const saved = await Promise.all(rows.map(async (row) => ({
    id: row.id, name: row.originalName, note: row.note, createdAt: row.createdAt,
    previewUrl: await createSignedUrl({ bucket: STORAGE_BUCKETS.customerUploads, objectKey: row.objectKey }),
  })));
  // Keep older Studio inspiration uploads visible after they move out of My Files.
  const legacy = await db.select().from(asset).where(and(eq(asset.ventureId, session.ventureId), like(asset.notes, "inspiration:%")))
    .orderBy(desc(asset.createdAt)).limit(60);
  const old = await Promise.all(legacy.filter((row) => row.status !== "archived").map(async (row) => ({
    id: row.id, name: row.name, note: "Older private inspiration reference", createdAt: row.createdAt,
    previewUrl: await createSignedUrl({ bucket: row.bucket, objectKey: row.objectKey }),
  })));
  return [...saved, ...old].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export async function submitPartnerFeedback(session: SessionUser, input: {
  category: string; message: string; pagePath?: string; workflowContext?: string;
}) {
  const message = input.message.trim().slice(0, 3000);
  if (message.length < 3) throw new ValidationError("Add a little more detail before sending.");
  const allowed = ["problem", "friction", "missing_capability", "idea"];
  const category = allowed.includes(input.category) ? input.category : "idea";
  const [row] = await getDb().insert(partnerFeedback).values({
    ventureId: session.ventureId, submittedById: session.appUser.id, category, message,
    pagePath: input.pagePath?.slice(0, 500) || null,
    workflowContext: input.workflowContext?.slice(0, 500) || null,
  }).returning({ id: partnerFeedback.id, createdAt: partnerFeedback.createdAt });
  return row;
}
