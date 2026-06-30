import { and, count, desc, eq, inArray } from "drizzle-orm";
import {
  countActiveProductsInCollection,
  ensureAutomaticCollections,
  getActiveProductIdsForCollection,
  syncProductCollectionAssignments,
} from "./collection-assignment";
import { AUTOMATIC_COLLECTIONS } from "./collections-config";
import { getDb } from "@/lib/db/client";
import {
  aiCreationSession,
  collection,
  collectionProduct,
  orderLineItem,
  product,
  productMedia,
} from "@/lib/db/schema";
import { recordAuditEvent } from "@/lib/domains/audit/service";
import { aiTimestampAuditFields } from "@/lib/domains/audit/timestamp";
import { resolveAiUserAuditFields } from "@/lib/domains/audit/user";
import { getAssetById } from "@/lib/domains/assets/service";
import { isApprovedAssetStatus } from "@/lib/domains/assets/types";
import {
  archivePilForProduct,
  compoundPilOnProductPublish,
} from "@/lib/domains/intelligence/pil-service";
import {
  buildProductIntelligenceOutcomeMetadata,
  shouldCompoundPilOnProductPublish,
} from "@/lib/domains/intelligence/product-intelligence-outcome";
import { NotFoundError, ValidationError } from "@/lib/shared/errors";
import { logger } from "@/lib/shared/logger";
import {
  canPublishProduct,
  getPublishReadiness,
  type FulfillmentType,
  type ProductCategory,
  type PublishReadiness,
} from "./publish";
import {
  resolveInactiveDraftStatus,
  type ProductDraftStatus,
} from "./draft-status";
import { productMediaPublicUrl, uploadToBucket } from "@/lib/storage/client";
import {
  productMediaObjectKey,
  STORAGE_BUCKETS,
} from "@/lib/storage/paths";

export type Product = typeof product.$inferSelect;

export { AUTOMATIC_COLLECTIONS } from "./collections-config";

export async function listProducts(ventureId: string) {
  const db = getDb();

  return db
    .select()
    .from(product)
    .where(eq(product.ventureId, ventureId))
    .orderBy(desc(product.updatedAt));
}

export async function getProductById(input: {
  ventureId: string;
  productId: string;
}) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(product)
    .where(
      and(
        eq(product.id, input.productId),
        eq(product.ventureId, input.ventureId),
      ),
    )
    .limit(1);

  if (!row) {
    throw new NotFoundError("Product not found");
  }

  return row;
}

export async function getProductMedia(productId: string) {
  const db = getDb();

  return db
    .select()
    .from(productMedia)
    .where(eq(productMedia.productId, productId))
    .orderBy(productMedia.sortOrder);
}

export async function getPrimaryProductImageUrl(
  productId: string,
): Promise<string | null> {
  const media = await getProductMedia(productId);
  const primary = media[0];

  return primary?.objectKey ? productMediaPublicUrl(primary.objectKey) : null;
}

async function countProductMedia(productId: string): Promise<number> {
  const db = getDb();
  const [row] = await db
    .select({ value: count() })
    .from(productMedia)
    .where(eq(productMedia.productId, productId));

  return row?.value ?? 0;
}

async function getLatestAiSessionForProduct(input: {
  ventureId: string;
  productId: string;
}) {
  const db = getDb();
  const [row] = await db
    .select({
      id: aiCreationSession.id,
      mode: aiCreationSession.mode,
      prompt: aiCreationSession.prompt,
      operatorNotes: aiCreationSession.operatorNotes,
      confidenceScore: aiCreationSession.confidenceScore,
      intakeDetection: aiCreationSession.intakeDetection,
      pieOutput: aiCreationSession.pieOutput,
    })
    .from(aiCreationSession)
    .where(
      and(
        eq(aiCreationSession.productId, input.productId),
        eq(aiCreationSession.ventureId, input.ventureId),
      ),
    )
    .orderBy(desc(aiCreationSession.createdAt))
    .limit(1);

  return row ?? null;
}

async function isSweetohPathValid(input: {
  ventureId: string;
  sourceAssetId: string | null;
}): Promise<boolean> {
  if (!input.sourceAssetId) {
    return false;
  }

  try {
    const sourceAsset = await getAssetById({
      ventureId: input.ventureId,
      assetId: input.sourceAssetId,
    });

    return (
      isApprovedAssetStatus(sourceAsset.status) &&
      (sourceAsset.assetType === "sweetoh_design" ||
        sourceAsset.assetType === "product_asset")
    );
  } catch {
    return false;
  }
}

export async function createProduct(input: {
  ventureId: string;
  slug: string;
  name: string;
  description?: string | null;
  priceCents: number;
  category: ProductCategory;
  fulfillmentType: FulfillmentType;
  supplierSku?: string | null;
  sourceAssetId?: string | null;
  actorUserId: string;
}) {
  if (input.fulfillmentType === "digital") {
    throw new ValidationError("Digital products are blocked at launch (ADR-002)");
  }

  const db = getDb();

  const [row] = await db
    .insert(product)
    .values({
      ventureId: input.ventureId,
      slug: input.slug,
      name: input.name,
      description: input.description ?? null,
      priceCents: input.priceCents,
      category: input.category,
      fulfillmentType: input.fulfillmentType,
      supplierSku: input.supplierSku ?? null,
      sourceAssetId: input.sourceAssetId ?? null,
      active: false,
      draftStatus: "draft",
    })
    .returning();

  if (!row) {
    throw new Error("Failed to create product");
  }

  await recordAuditEvent({
    ventureId: input.ventureId,
    actorUserId: input.actorUserId,
    action: "product.created",
    entityType: "product",
    entityId: row.id,
    metadata: { slug: row.slug, category: row.category },
  });

  logger.info("product_created", { productId: row.id, ventureId: input.ventureId });

  return row;
}

export async function evaluateProductPublishReadiness(input: {
  ventureId: string;
  productId: string;
}): Promise<PublishReadiness> {
  const existing = await getProductById(input);
  const mediaCount = await countProductMedia(existing.id);
  const sweetohPathValid = await isSweetohPathValid({
    ventureId: input.ventureId,
    sourceAssetId: existing.sourceAssetId,
  });

  return getPublishReadiness({
    category: existing.category as ProductCategory,
    fulfillmentType: existing.fulfillmentType as FulfillmentType,
    supplierSku: existing.supplierSku,
    priceCents: existing.priceCents,
    hasMedia: mediaCount > 0,
    sweetohPathValid,
  });
}

export async function updateProduct(input: {
  ventureId: string;
  productId: string;
  actorUserId: string;
  slug: string;
  name: string;
  description?: string | null;
  priceCents: number;
  category: ProductCategory;
  fulfillmentType: FulfillmentType;
  supplierSku?: string | null;
  sourceAssetId?: string | null;
  shortDescription?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  internalNotes?: string | null;
  suggestedTags?: string[] | null;
  suggestedCollections?: string[] | null;
}) {
  if (input.fulfillmentType === "digital") {
    throw new ValidationError("Digital products are blocked at launch (ADR-002)");
  }

  const existing = await getProductById({
    ventureId: input.ventureId,
    productId: input.productId,
  });

  if (existing.draftStatus === "archived") {
    throw new ValidationError("Archived products cannot be edited.");
  }

  const db = getDb();

  const [row] = await db
    .update(product)
    .set({
      slug: input.slug,
      name: input.name,
      description: input.description ?? null,
      priceCents: input.priceCents,
      category: input.category,
      fulfillmentType: input.fulfillmentType,
      supplierSku: input.supplierSku ?? null,
      sourceAssetId: input.sourceAssetId ?? null,
      shortDescription: input.shortDescription ?? null,
      seoTitle: input.seoTitle ?? null,
      seoDescription: input.seoDescription ?? null,
      internalNotes: input.internalNotes ?? null,
      suggestedTags: input.suggestedTags ?? null,
      suggestedCollections: input.suggestedCollections ?? null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(product.id, input.productId),
        eq(product.ventureId, input.ventureId),
      ),
    )
    .returning();

  if (!row) {
    throw new NotFoundError("Product not found");
  }

  const aiSession = await getLatestAiSessionForProduct({
    ventureId: input.ventureId,
    productId: input.productId,
  });

  if (aiSession) {
    const changedFields: string[] = [];

    if (existing.name !== row.name) changedFields.push("name");
    if (existing.slug !== row.slug) changedFields.push("slug");
    if (existing.description !== row.description) changedFields.push("description");
    if (existing.shortDescription !== row.shortDescription) {
      changedFields.push("shortDescription");
    }
    if (existing.seoTitle !== row.seoTitle) changedFields.push("seoTitle");
    if (existing.seoDescription !== row.seoDescription) {
      changedFields.push("seoDescription");
    }
    if (existing.internalNotes !== row.internalNotes) {
      changedFields.push("internalNotes");
    }
    if (
      JSON.stringify(existing.suggestedTags ?? []) !==
      JSON.stringify(row.suggestedTags ?? [])
    ) {
      changedFields.push("suggestedTags");
    }
    if (
      JSON.stringify(existing.suggestedCollections ?? []) !==
      JSON.stringify(row.suggestedCollections ?? [])
    ) {
      changedFields.push("suggestedCollections");
    }
    if (existing.category !== row.category) changedFields.push("category");
    if (existing.priceCents !== row.priceCents) changedFields.push("priceCents");

    if (changedFields.length > 0) {
      const actorFields = await resolveAiUserAuditFields(input.actorUserId);

      await recordAuditEvent({
        ventureId: input.ventureId,
        actorUserId: input.actorUserId,
        action: "product.ai_outputs_edited",
        entityType: "product",
        entityId: row.id,
        metadata: {
          sessionId: aiSession.id,
          mode: aiSession.mode,
          changedFields,
          productName: row.name,
          ...aiTimestampAuditFields(),
          ...actorFields,
        },
      });
    }
  }

  if (existing.active) {
    const readiness = await evaluateProductPublishReadiness({
      ventureId: input.ventureId,
      productId: input.productId,
    });

    if (!readiness.canPublish) {
      const nextDraftStatus = resolveInactiveDraftStatus({
        hasAiSession: Boolean(aiSession),
        canPublish: false,
        currentStatus: existing.draftStatus as ProductDraftStatus,
      });

      await db
        .update(product)
        .set({
          active: false,
          draftStatus: nextDraftStatus,
          updatedAt: new Date(),
        })
        .where(eq(product.id, input.productId));

      await recordAuditEvent({
        ventureId: input.ventureId,
        actorUserId: input.actorUserId,
        action: "product.unpublished",
        entityType: "product",
        entityId: row.id,
        metadata: {
          reason: "auto_unpublish_on_invalid_update",
          blockingReason: readiness.blockingReason,
          draftStatus: nextDraftStatus,
        },
      });

      logger.info("product_auto_unpublished", {
        productId: row.id,
        ventureId: input.ventureId,
      });
    }
  } else if (
    row.draftStatus !== "rejected" &&
    row.draftStatus !== "archived"
  ) {
    const readiness = await evaluateProductPublishReadiness({
      ventureId: input.ventureId,
      productId: input.productId,
    });
    const nextDraftStatus = resolveInactiveDraftStatus({
      hasAiSession: Boolean(aiSession),
      canPublish: readiness.canPublish,
      currentStatus: row.draftStatus as ProductDraftStatus,
    });

    if (nextDraftStatus !== row.draftStatus) {
      await db
        .update(product)
        .set({ draftStatus: nextDraftStatus, updatedAt: new Date() })
        .where(eq(product.id, input.productId));
    }
  }

  await recordAuditEvent({
    ventureId: input.ventureId,
    actorUserId: input.actorUserId,
    action: "product.updated",
    entityType: "product",
    entityId: row.id,
    metadata: { slug: row.slug },
  });

  const latest = await getProductById({
    ventureId: input.ventureId,
    productId: input.productId,
  });

  if (latest.active) {
    await syncProductCollectionAssignments({
      ventureId: input.ventureId,
      productId: latest.id,
      actorUserId: input.actorUserId,
    });
  }

  return latest;
}

export async function setProductStudioProject(input: {
  ventureId: string;
  productId: string;
  studioProjectId: string | null;
  actorUserId: string;
}) {
  await getProductById({ ventureId: input.ventureId, productId: input.productId });

  const db = getDb();

  const [row] = await db
    .update(product)
    .set({ studioProjectId: input.studioProjectId, updatedAt: new Date() })
    .where(
      and(
        eq(product.id, input.productId),
        eq(product.ventureId, input.ventureId),
      ),
    )
    .returning();

  if (!row) {
    throw new NotFoundError("Product not found");
  }

  await recordAuditEvent({
    ventureId: input.ventureId,
    actorUserId: input.actorUserId,
    action: "product.studio_project_linked",
    entityType: "product",
    entityId: row.id,
    metadata: { studioProjectId: input.studioProjectId },
  });

  return row;
}

export async function addProductMediaUpload(input: {
  ventureId: string;
  ventureSlug: string;
  productId: string;
  actorUserId: string;
  file: Buffer | Uint8Array;
  filename: string;
  mimeType: string;
  assetId?: string | null;
}) {
  await getProductById({
    ventureId: input.ventureId,
    productId: input.productId,
  });

  const db = getDb();
  const existingMedia = await getProductMedia(input.productId);
  const objectKey = productMediaObjectKey(
    input.ventureSlug,
    input.productId,
    input.filename,
  );

  await uploadToBucket({
    bucket: STORAGE_BUCKETS.productMedia,
    objectKey,
    body: input.file,
    contentType: input.mimeType,
    upsert: true,
  });

  const [row] = await db
    .insert(productMedia)
    .values({
      productId: input.productId,
      objectKey,
      assetId: input.assetId ?? null,
      sortOrder: existingMedia.length,
    })
    .returning();

  if (!row) {
    throw new Error("Failed to create product media row");
  }

  await recordAuditEvent({
    ventureId: input.ventureId,
    actorUserId: input.actorUserId,
    action: "product.media_added",
    entityType: "product",
    entityId: input.productId,
    metadata: { mediaId: row.id, objectKey },
  });

  return row;
}

export async function removeProductMedia(input: {
  ventureId: string;
  productId: string;
  mediaId: string;
  actorUserId: string;
}) {
  await getProductById({
    ventureId: input.ventureId,
    productId: input.productId,
  });

  const db = getDb();
  const [existing] = await db
    .select()
    .from(productMedia)
    .where(
      and(
        eq(productMedia.id, input.mediaId),
        eq(productMedia.productId, input.productId),
      ),
    )
    .limit(1);

  if (!existing) {
    throw new NotFoundError("Product media not found");
  }

  await db.delete(productMedia).where(eq(productMedia.id, input.mediaId));

  await recordAuditEvent({
    ventureId: input.ventureId,
    actorUserId: input.actorUserId,
    action: "product.media_removed",
    entityType: "product",
    entityId: input.productId,
    metadata: { mediaId: input.mediaId },
  });
}

export async function syncAutomaticCollections(ventureId: string) {
  return ensureAutomaticCollections(ventureId);
}

export async function publishProduct(input: {
  ventureId: string;
  productId: string;
  actorUserId: string;
}) {
  const db = getDb();
  const existing = await getProductById(input);

  if (existing.draftStatus === "archived") {
    throw new ValidationError("Archived products cannot be published.");
  }

  if (existing.draftStatus === "rejected") {
    throw new ValidationError("Rejected products cannot be published.");
  }

  const mediaCount = await countProductMedia(existing.id);
  const sweetohPathValid = await isSweetohPathValid({
    ventureId: input.ventureId,
    sourceAssetId: existing.sourceAssetId,
  });

  const gate = canPublishProduct({
    category: existing.category as ProductCategory,
    fulfillmentType: existing.fulfillmentType as FulfillmentType,
    supplierSku: existing.supplierSku,
    priceCents: existing.priceCents,
    hasMedia: mediaCount > 0,
    sweetohPathValid,
  });

  if (!gate.ok) {
    throw new ValidationError(gate.reason);
  }

  const [row] = await db
    .update(product)
    .set({ active: true, draftStatus: "published", updatedAt: new Date() })
    .where(
      and(
        eq(product.id, input.productId),
        eq(product.ventureId, input.ventureId),
      ),
    )
    .returning();

  if (!row) {
    throw new NotFoundError("Product not found");
  }

  const aiSession = await getLatestAiSessionForProduct({
    ventureId: input.ventureId,
    productId: row.id,
  });
  const actorFields = await resolveAiUserAuditFields(input.actorUserId);
  const outcomeMetadata = buildProductIntelligenceOutcomeMetadata({
    outcome: "published",
    product: row,
    session: aiSession,
    actorFields,
  });

  await recordAuditEvent({
    ventureId: input.ventureId,
    actorUserId: input.actorUserId,
    action: "product.published",
    entityType: "product",
    entityId: row.id,
    metadata: outcomeMetadata,
  });

  if (aiSession) {
    await recordAuditEvent({
      ventureId: input.ventureId,
      actorUserId: input.actorUserId,
      action: "product.ai_draft_published",
      entityType: "product",
      entityId: row.id,
      metadata: outcomeMetadata,
    });
  }

  if (
    shouldCompoundPilOnProductPublish({
      category: row.category,
      fulfillmentType: row.fulfillmentType,
      hasAiSession: Boolean(aiSession),
    })
  ) {
    await compoundPilOnProductPublish({
      ventureId: input.ventureId,
      productId: row.id,
      approvedByUserId: input.actorUserId,
    });
  }

  await syncProductCollectionAssignments({
    ventureId: input.ventureId,
    productId: row.id,
    actorUserId: input.actorUserId,
  });

  logger.info("product_published", {
    productId: row.id,
    ventureId: input.ventureId,
  });

  return row;
}

export async function unpublishProduct(input: {
  ventureId: string;
  productId: string;
  actorUserId: string;
}) {
  const db = getDb();
  const existing = await getProductById(input);

  const readiness = await evaluateProductPublishReadiness(input);
  const aiSession = await getLatestAiSessionForProduct({
    ventureId: input.ventureId,
    productId: input.productId,
  });
  const nextDraftStatus: ProductDraftStatus = readiness.canPublish
    ? "approved"
    : resolveInactiveDraftStatus({
        hasAiSession: Boolean(aiSession),
        canPublish: false,
        currentStatus: "draft",
      });

  const [row] = await db
    .update(product)
    .set({
      active: false,
      draftStatus: nextDraftStatus,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(product.id, input.productId),
        eq(product.ventureId, input.ventureId),
      ),
    )
    .returning();

  if (!row) {
    throw new NotFoundError("Product not found");
  }

  const actorFields = await resolveAiUserAuditFields(input.actorUserId);

  await recordAuditEvent({
    ventureId: input.ventureId,
    actorUserId: input.actorUserId,
    action: "product.unpublished",
    entityType: "product",
    entityId: row.id,
    metadata: buildProductIntelligenceOutcomeMetadata({
      outcome: "unpublished",
      product: row,
      session: aiSession,
      actorFields,
    }),
  });

  await archivePilForProduct({
    ventureId: input.ventureId,
    productId: row.id,
    actorUserId: input.actorUserId,
  });

  return row;
}

export async function rejectProductDraft(input: {
  ventureId: string;
  productId: string;
  actorUserId: string;
  reason?: string | null;
}) {
  const db = getDb();
  const existing = await getProductById(input);

  if (existing.active) {
    throw new ValidationError(
      "Cannot reject a published product. Unpublish it from product detail first.",
    );
  }

  const [ordered] = await db
    .select({ id: orderLineItem.id })
    .from(orderLineItem)
    .where(eq(orderLineItem.productId, input.productId))
    .limit(1);

  if (ordered) {
    throw new ValidationError(
      "Cannot reject a product that appears on an order.",
    );
  }

  const aiSession = await getLatestAiSessionForProduct({
    ventureId: input.ventureId,
    productId: input.productId,
  });

  const [rejected] = await db
    .update(product)
    .set({
      draftStatus: "rejected",
      active: false,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(product.id, input.productId),
        eq(product.ventureId, input.ventureId),
        eq(product.active, false),
      ),
    )
    .returning();

  if (!rejected) {
    throw new NotFoundError("Product not found");
  }

  const actorFields = await resolveAiUserAuditFields(input.actorUserId);

  await recordAuditEvent({
    ventureId: input.ventureId,
    actorUserId: input.actorUserId,
    action: "product.draft_rejected",
    entityType: "product",
    entityId: rejected.id,
    metadata: buildProductIntelligenceOutcomeMetadata({
      outcome: "rejected",
      product: rejected,
      session: aiSession,
      actorFields,
      reason: input.reason,
    }),
  });

  logger.info("product_draft_rejected", {
    productId: rejected.id,
    ventureId: input.ventureId,
  });

  return rejected;
}

export async function archiveProduct(input: {
  ventureId: string;
  productId: string;
  actorUserId: string;
  reason?: string | null;
}) {
  const db = getDb();
  const existing = await getProductById(input);

  if (existing.draftStatus === "archived") {
    throw new ValidationError("Product is already archived.");
  }

  const [ordered] = await db
    .select({ id: orderLineItem.id })
    .from(orderLineItem)
    .where(eq(orderLineItem.productId, input.productId))
    .limit(1);

  if (ordered) {
    throw new ValidationError(
      "Cannot archive a product that appears on an order.",
    );
  }

  const aiSession = await getLatestAiSessionForProduct({
    ventureId: input.ventureId,
    productId: input.productId,
  });

  const [row] = await db
    .update(product)
    .set({
      active: false,
      draftStatus: "archived",
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(product.id, input.productId),
        eq(product.ventureId, input.ventureId),
      ),
    )
    .returning();

  if (!row) {
    throw new NotFoundError("Product not found");
  }

  const actorFields = await resolveAiUserAuditFields(input.actorUserId);

  await recordAuditEvent({
    ventureId: input.ventureId,
    actorUserId: input.actorUserId,
    action: "product.archived",
    entityType: "product",
    entityId: row.id,
    metadata: buildProductIntelligenceOutcomeMetadata({
      outcome: "archived",
      product: row,
      session: aiSession,
      actorFields,
      reason: input.reason,
    }),
  });

  await archivePilForProduct({
    ventureId: input.ventureId,
    productId: row.id,
    actorUserId: input.actorUserId,
  });

  logger.info("product_archived", {
    productId: row.id,
    ventureId: input.ventureId,
  });

  return row;
}

export async function submitProductDraftForReview(input: {
  ventureId: string;
  productId: string;
  actorUserId: string;
}) {
  const db = getDb();
  const existing = await getProductById(input);

  if (existing.active) {
    throw new ValidationError("Published products are already on the storefront.");
  }

  if (existing.draftStatus === "rejected") {
    throw new ValidationError("Cannot submit a rejected draft for review.");
  }

  if (existing.draftStatus === "archived") {
    throw new ValidationError("Cannot submit an archived draft for review.");
  }

  if (existing.draftStatus === "pending_review") {
    throw new ValidationError("This draft is already in the review queue.");
  }

  if (existing.draftStatus !== "draft" && existing.draftStatus !== "needs_work") {
    throw new ValidationError("Only drafts or needs-work items can be submitted for review.");
  }

  const aiSession = await getLatestAiSessionForProduct({
    ventureId: input.ventureId,
    productId: input.productId,
  });
  const readiness = await evaluateProductPublishReadiness(input);
  const draftStatus: ProductDraftStatus = readiness.canPublish
    ? "pending_review"
    : "needs_work";

  const [row] = await db
    .update(product)
    .set({ draftStatus, updatedAt: new Date() })
    .where(
      and(
        eq(product.id, input.productId),
        eq(product.ventureId, input.ventureId),
        eq(product.active, false),
      ),
    )
    .returning();

  if (!row) {
    throw new NotFoundError("Product not found");
  }

  const actorFields = await resolveAiUserAuditFields(input.actorUserId);

  await recordAuditEvent({
    ventureId: input.ventureId,
    actorUserId: input.actorUserId,
    action: "product.draft_submitted_for_review",
    entityType: "product",
    entityId: row.id,
    metadata: buildProductIntelligenceOutcomeMetadata({
      outcome: "submitted_for_review",
      product: row,
      session: aiSession,
      actorFields,
      canPublish: readiness.canPublish,
    }),
  });

  logger.info("product_draft_submitted_for_review", {
    productId: row.id,
    ventureId: input.ventureId,
    draftStatus: row.draftStatus,
  });

  return row;
}

export async function markProductDraftReviewed(input: {
  ventureId: string;
  productId: string;
  actorUserId: string;
}) {
  const db = getDb();
  const existing = await getProductById(input);

  if (existing.active) {
    throw new ValidationError("Product is already published.");
  }

  if (existing.draftStatus === "rejected") {
    throw new ValidationError("Cannot review a rejected draft.");
  }

  if (existing.draftStatus === "archived") {
    throw new ValidationError("Cannot review an archived draft.");
  }

  const aiSession = await getLatestAiSessionForProduct({
    ventureId: input.ventureId,
    productId: input.productId,
  });
  const readiness = await evaluateProductPublishReadiness(input);
  const draftStatus: ProductDraftStatus = readiness.canPublish
    ? "approved"
    : "needs_work";

  const [row] = await db
    .update(product)
    .set({ draftStatus, updatedAt: new Date() })
    .where(
      and(
        eq(product.id, input.productId),
        eq(product.ventureId, input.ventureId),
        eq(product.active, false),
      ),
    )
    .returning();

  if (!row) {
    throw new NotFoundError("Product not found");
  }

  const actorFields = await resolveAiUserAuditFields(input.actorUserId);

  await recordAuditEvent({
    ventureId: input.ventureId,
    actorUserId: input.actorUserId,
    action: "product.draft_reviewed",
    entityType: "product",
    entityId: row.id,
    metadata: buildProductIntelligenceOutcomeMetadata({
      outcome: draftStatus === "approved" ? "approved" : "reviewed",
      product: row,
      session: aiSession,
      actorFields,
      canPublish: readiness.canPublish,
    }),
  });

  logger.info("product_draft_reviewed", {
    productId: row.id,
    ventureId: input.ventureId,
    draftStatus: row.draftStatus,
    canPublish: readiness.canPublish,
  });

  return row;
}

export async function listCollections(ventureId: string) {
  const db = getDb();

  return db
    .select()
    .from(collection)
    .where(eq(collection.ventureId, ventureId))
    .orderBy(collection.name);
}

export async function countActiveProductsByCategory(input: {
  ventureId: string;
  category: ProductCategory;
}): Promise<number> {
  const db = getDb();
  const [row] = await db
    .select({ value: count() })
    .from(product)
    .where(
      and(
        eq(product.ventureId, input.ventureId),
        eq(product.category, input.category),
        eq(product.active, true),
      ),
    );

  return row?.value ?? 0;
}

export async function listActiveProducts(ventureId: string) {
  const db = getDb();

  return db
    .select()
    .from(product)
    .where(and(eq(product.ventureId, ventureId), eq(product.active, true)))
    .orderBy(desc(product.updatedAt));
}

export async function getActiveProductBySlug(input: {
  ventureId: string;
  slug: string;
}) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(product)
    .where(
      and(
        eq(product.ventureId, input.ventureId),
        eq(product.slug, input.slug),
        eq(product.active, true),
      ),
    )
    .limit(1);

  if (!row) {
    throw new NotFoundError("Product not found");
  }

  return row;
}

export async function getActiveProductById(input: {
  ventureId: string;
  productId: string;
}) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(product)
    .where(
      and(
        eq(product.ventureId, input.ventureId),
        eq(product.id, input.productId),
        eq(product.active, true),
      ),
    )
    .limit(1);

  if (!row) {
    throw new NotFoundError("Product not found");
  }

  return row;
}

export async function listActiveCollections(ventureId: string) {
  const db = getDb();

  return db
    .select()
    .from(collection)
    .where(and(eq(collection.ventureId, ventureId), eq(collection.active, true)))
    .orderBy(collection.name);
}

export async function getCollectionBySlug(input: {
  ventureId: string;
  slug: string;
}) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(collection)
    .where(
      and(
        eq(collection.ventureId, input.ventureId),
        eq(collection.slug, input.slug),
        eq(collection.active, true),
      ),
    )
    .limit(1);

  if (!row) {
    throw new NotFoundError("Collection not found");
  }

  return row;
}

export async function getProductsForCollection(
  collectionRow: typeof collection.$inferSelect,
) {
  const db = getDb();
  const productIds = await getActiveProductIdsForCollection(collectionRow);

  if (productIds.length === 0) {
    return [];
  }

  if (collectionRow.kind === "manual") {
    return db
      .select({ product })
      .from(collectionProduct)
      .innerJoin(product, eq(collectionProduct.productId, product.id))
      .where(
        and(
          eq(collectionProduct.collectionId, collectionRow.id),
          eq(product.active, true),
        ),
      )
      .orderBy(collectionProduct.sortOrder)
      .then((rows) => rows.map((row) => row.product));
  }

  return db
    .select()
    .from(product)
    .where(inArray(product.id, productIds))
    .orderBy(desc(product.updatedAt));
}

export async function getStorefrontNavCollections(ventureId: string) {
  const collections = await listCollections(ventureId);
  const collectionBySlug = new Map(collections.map((item) => [item.slug, item]));

  const counts = await Promise.all(
    AUTOMATIC_COLLECTIONS.map(async (item) => {
      const row = collectionBySlug.get(item.slug);
      const activeCount = row
        ? await countActiveProductsInCollection(row)
        : await countActiveProductsByCategory({
            ventureId,
            category: item.category,
          });

      return {
        ...item,
        activeCount,
      };
    }),
  );

  return counts.filter((item) => item.category !== "originals" || item.activeCount > 0);
}

export async function upsertAutomaticCollection(input: {
  ventureId: string;
  slug: string;
  name: string;
  ruleKey: string;
  active?: boolean;
}) {
  const db = getDb();

  const [row] = await db
    .insert(collection)
    .values({
      ventureId: input.ventureId,
      slug: input.slug,
      name: input.name,
      kind: "automatic",
      ruleKey: input.ruleKey,
      active: input.active ?? true,
    })
    .onConflictDoUpdate({
      target: [collection.ventureId, collection.slug],
      set: {
        name: input.name,
        ruleKey: input.ruleKey,
        kind: "automatic",
        active: input.active ?? true,
        updatedAt: new Date(),
      },
    })
    .returning();

  return row;
}
