import { and, count, desc, eq, isNull } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import {
  aiCreationSession,
  aiCreationSessionAsset,
  asset,
  pilEntries,
  pieTemplates,
  product,
} from "@/lib/db/schema";
import type { PilEntryKind } from "@/lib/db/schema/pil";
import { recordAuditEvent } from "@/lib/domains/audit/service";
import { getPieOutputForSession } from "./pie-output";

export async function compoundPilOnAssetApprove(input: {
  ventureId: string;
  assetId: string;
  approvedByUserId: string;
}) {
  const db = getDb();

  const [assetRow] = await db
    .select({
      id: asset.id,
      name: asset.name,
      assetType: asset.assetType,
      status: asset.status,
    })
    .from(asset)
    .where(
      and(eq(asset.id, input.assetId), eq(asset.ventureId, input.ventureId)),
    )
    .limit(1);

  if (!assetRow) {
    return null;
  }

  const sessionLink = await db
    .select({
      sessionId: aiCreationSession.id,
      productId: aiCreationSession.productId,
      pieOutput: aiCreationSession.pieOutput,
      intakeDetection: aiCreationSession.intakeDetection,
    })
    .from(aiCreationSessionAsset)
    .innerJoin(
      aiCreationSession,
      eq(aiCreationSessionAsset.sessionId, aiCreationSession.id),
    )
    .where(eq(aiCreationSessionAsset.assetId, input.assetId))
    .orderBy(desc(aiCreationSession.createdAt))
    .limit(1);

  const session = sessionLink[0];
  const pieOutput = session
    ? getPieOutputForSession({
        pieOutput: session.pieOutput,
        intakeDetection: session.intakeDetection,
      })
    : null;

  const [existing] = await db
    .select({ id: pilEntries.id })
    .from(pilEntries)
    .where(
      and(
        eq(pilEntries.assetId, input.assetId),
        isNull(pilEntries.archivedAt),
      ),
    )
    .limit(1);

  const payload = {
    assetType: assetRow.assetType,
    pieOutput,
    productId: session?.productId ?? null,
  };

  const now = new Date();

  if (existing) {
    const [row] = await db
      .update(pilEntries)
      .set({
        title: assetRow.name,
        payload,
        sourceSessionId: session?.sessionId ?? null,
        approvedByUserId: input.approvedByUserId,
        approvedAt: now,
        updatedAt: now,
      })
      .where(eq(pilEntries.id, existing.id))
      .returning();

    return row ?? null;
  }

  const [row] = await db
    .insert(pilEntries)
    .values({
      ventureId: input.ventureId,
      kind: "asset",
      title: assetRow.name,
      payload,
      assetId: input.assetId,
      sourceSessionId: session?.sessionId ?? null,
      approvedByUserId: input.approvedByUserId,
    })
    .returning();

  if (row) {
    await recordAuditEvent({
      ventureId: input.ventureId,
      actorUserId: input.approvedByUserId,
      action: "pil.compound",
      entityType: "pil_entry",
      entityId: row.id,
      metadata: { kind: "asset", assetId: input.assetId },
    });
  }

  return row ?? null;
}

export async function compoundPilOnTemplateApprove(input: {
  ventureId: string;
  templateId: string;
  approvedByUserId: string;
}) {
  const db = getDb();

  const [template] = await db
    .select()
    .from(pieTemplates)
    .where(
      and(
        eq(pieTemplates.id, input.templateId),
        eq(pieTemplates.ventureId, input.ventureId),
      ),
    )
    .limit(1);

  if (!template) {
    return null;
  }

  const [existing] = await db
    .select({ id: pilEntries.id })
    .from(pilEntries)
    .where(
      and(
        eq(pilEntries.pieTemplateId, input.templateId),
        isNull(pilEntries.archivedAt),
      ),
    )
    .limit(1);

  const payload = {
    template: template.template,
    productType: template.productType,
    sourceProductId: template.sourceProductId,
  };

  const now = new Date();

  if (existing) {
    const [row] = await db
      .update(pilEntries)
      .set({
        title: template.name,
        payload,
        sourceSessionId: template.sourceSessionId,
        approvedByUserId: input.approvedByUserId,
        approvedAt: now,
        updatedAt: now,
      })
      .where(eq(pilEntries.id, existing.id))
      .returning();

    return row ?? null;
  }

  const [row] = await db
    .insert(pilEntries)
    .values({
      ventureId: input.ventureId,
      kind: "template",
      title: template.name,
      payload,
      pieTemplateId: input.templateId,
      sourceSessionId: template.sourceSessionId,
      approvedByUserId: input.approvedByUserId,
    })
    .returning();

  if (row) {
    await recordAuditEvent({
      ventureId: input.ventureId,
      actorUserId: input.approvedByUserId,
      action: "pil.compound",
      entityType: "pil_entry",
      entityId: row.id,
      metadata: { kind: "template", templateId: input.templateId },
    });
  }

  return row ?? null;
}

export async function compoundPilOnProductPublish(input: {
  ventureId: string;
  productId: string;
  approvedByUserId: string;
}) {
  const db = getDb();

  const [productRow] = await db
    .select()
    .from(product)
    .where(
      and(eq(product.id, input.productId), eq(product.ventureId, input.ventureId)),
    )
    .limit(1);

  if (!productRow || !productRow.active) {
    return null;
  }

  const [session] = await db
    .select()
    .from(aiCreationSession)
    .where(
      and(
        eq(aiCreationSession.productId, input.productId),
        eq(aiCreationSession.ventureId, input.ventureId),
      ),
    )
    .orderBy(desc(aiCreationSession.createdAt))
    .limit(1);

  const pieOutput = session
    ? getPieOutputForSession({
        pieOutput: session.pieOutput,
        intakeDetection: session.intakeDetection,
      })
    : null;

  const payload = {
    category: productRow.category,
    fulfillmentType: productRow.fulfillmentType,
    priceCents: productRow.priceCents,
    slug: productRow.slug,
    listing: {
      name: productRow.name,
      description: productRow.description,
      shortDescription: productRow.shortDescription,
      seoTitle: productRow.seoTitle,
      seoDescription: productRow.seoDescription,
      internalNotes: productRow.internalNotes,
      suggestedTags: productRow.suggestedTags,
      suggestedCollections: productRow.suggestedCollections,
    },
    pieOutput,
    studioProjectId: productRow.studioProjectId,
    sourceAssetId: productRow.sourceAssetId,
    outcome: "published" as const,
  };

  const [existing] = await db
    .select({ id: pilEntries.id })
    .from(pilEntries)
    .where(
      and(
        eq(pilEntries.productId, input.productId),
        isNull(pilEntries.archivedAt),
      ),
    )
    .limit(1);

  const now = new Date();

  if (existing) {
    const [row] = await db
      .update(pilEntries)
      .set({
        title: productRow.name,
        payload,
        sourceSessionId: session?.id ?? null,
        approvedByUserId: input.approvedByUserId,
        approvedAt: now,
        updatedAt: now,
        archivedAt: null,
      })
      .where(eq(pilEntries.id, existing.id))
      .returning();

    return row ?? null;
  }

  const [row] = await db
    .insert(pilEntries)
    .values({
      ventureId: input.ventureId,
      kind: "product",
      title: productRow.name,
      payload,
      productId: input.productId,
      sourceSessionId: session?.id ?? null,
      approvedByUserId: input.approvedByUserId,
    })
    .returning();

  if (row) {
    await recordAuditEvent({
      ventureId: input.ventureId,
      actorUserId: input.approvedByUserId,
      action: "pil.compound",
      entityType: "pil_entry",
      entityId: row.id,
      metadata: { kind: "product", productId: input.productId },
    });
  }

  return row ?? null;
}

export async function archivePilForProduct(input: {
  ventureId: string;
  productId: string;
  actorUserId: string;
}) {
  const db = getDb();
  const now = new Date();

  const [row] = await db
    .update(pilEntries)
    .set({ archivedAt: now, updatedAt: now })
    .where(
      and(
        eq(pilEntries.ventureId, input.ventureId),
        eq(pilEntries.productId, input.productId),
        isNull(pilEntries.archivedAt),
      ),
    )
    .returning();

  if (!row) {
    return null;
  }

  await recordAuditEvent({
    ventureId: input.ventureId,
    actorUserId: input.actorUserId,
    action: "pil.archived",
    entityType: "pil_entry",
    entityId: row.id,
    metadata: { kind: "product", productId: input.productId },
  });

  return row;
}

export async function listPilEntriesForVenture(ventureId: string) {
  const db = getDb();
  return db
    .select()
    .from(pilEntries)
    .where(
      and(eq(pilEntries.ventureId, ventureId), isNull(pilEntries.archivedAt)),
    )
    .orderBy(desc(pilEntries.approvedAt));
}

export function getPilEntryHref(entry: {
  kind: PilEntryKind;
  productId: string | null;
  assetId: string | null;
  pieTemplateId: string | null;
}): string | null {
  if (entry.kind === "product" && entry.productId) {
    return `/owner/products/${entry.productId}`;
  }

  if (entry.kind === "asset" && entry.assetId) {
    return `/owner/library`;
  }

  if (entry.kind === "template" && entry.pieTemplateId) {
    return `/owner/intelligence/templates`;
  }

  return null;
}

export async function countPilEntries(ventureId: string) {
  const db = getDb();
  const rows = await db
    .select({
      kind: pilEntries.kind,
      count: count(),
    })
    .from(pilEntries)
    .where(
      and(eq(pilEntries.ventureId, ventureId), isNull(pilEntries.archivedAt)),
    )
    .groupBy(pilEntries.kind);

  return {
    byKind: rows as Array<{ kind: PilEntryKind; count: number }>,
  };
}
