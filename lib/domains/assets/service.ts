import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { appUser, asset } from "@/lib/db/schema";
import { recordAuditEvent } from "@/lib/domains/audit/service";
import { compoundPilOnAssetApprove } from "@/lib/domains/intelligence/pil-service";
import { NotFoundError, ValidationError } from "@/lib/shared/errors";
import { logger } from "@/lib/shared/logger";
import { createSignedUrl, productMediaPublicUrl, uploadToBucket } from "@/lib/storage/client";
import {
  customerUploadObjectKey,
  designLibraryObjectKey,
  STORAGE_BUCKETS,
} from "@/lib/storage/paths";
import type { AssetStatus, AssetType } from "./types";
import { isApprovedAssetStatus } from "./types";

export const IMAGE_UPLOAD_MAX_BYTES = 10 * 1024 * 1024;

export const IMAGE_UPLOAD_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

export function validateImageUpload(input: {
  mimeType: string;
  sizeBytes: number;
}) {
  if (!IMAGE_UPLOAD_MIME_TYPES.includes(input.mimeType as (typeof IMAGE_UPLOAD_MIME_TYPES)[number])) {
    throw new ValidationError(
      "Upload a JPEG, PNG, WebP, or GIF image (max 10 MB).",
    );
  }

  if (input.sizeBytes > IMAGE_UPLOAD_MAX_BYTES) {
    throw new ValidationError("Image must be 10 MB or smaller.");
  }

  if (input.sizeBytes === 0) {
    throw new ValidationError("Image file is empty.");
  }
}

export async function listDraftAssetsForReview(ventureId: string) {
  const db = getDb();

  return db
    .select({
      asset,
      uploaderEmail: appUser.email,
      uploaderRole: appUser.role,
    })
    .from(asset)
    .leftJoin(appUser, eq(asset.uploadedById, appUser.id))
    .where(and(eq(asset.ventureId, ventureId), eq(asset.status, "draft")))
    .orderBy(desc(asset.createdAt));
}

export async function listAssets(input: {
  ventureId: string;
  status?: AssetStatus;
  uploadedById?: string;
}) {
  const db = getDb();
  const conditions = [eq(asset.ventureId, input.ventureId)];

  if (input.status) {
    conditions.push(eq(asset.status, input.status));
  }

  if (input.uploadedById) {
    conditions.push(eq(asset.uploadedById, input.uploadedById));
  }

  return db
    .select()
    .from(asset)
    .where(and(...conditions))
    .orderBy(desc(asset.createdAt));
}

export async function getAssetById(input: {
  ventureId: string;
  assetId: string;
}) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(asset)
    .where(
      and(eq(asset.id, input.assetId), eq(asset.ventureId, input.ventureId)),
    )
    .limit(1);

  if (!row) {
    throw new NotFoundError("Asset not found");
  }

  return row;
}

export async function createCustomerRequestImageUpload(input: {
  ventureId: string;
  ventureSlug: string;
  studioProjectId: string;
  file: Buffer | Uint8Array;
  filename: string;
  mimeType: string;
}) {
  validateImageUpload({
    mimeType: input.mimeType,
    sizeBytes: input.file.length,
  });

  const db = getDb();
  const assetId = crypto.randomUUID();
  const objectKey = customerUploadObjectKey(
    input.ventureSlug,
    input.studioProjectId,
    `${assetId}-${input.filename}`,
  );

  await uploadToBucket({
    bucket: STORAGE_BUCKETS.customerUploads,
    objectKey,
    body: input.file,
    contentType: input.mimeType,
  });

  const [row] = await db
    .insert(asset)
    .values({
      id: assetId,
      ventureId: input.ventureId,
      name: input.filename,
      assetType: "product_asset",
      status: "draft",
      bucket: STORAGE_BUCKETS.customerUploads,
      objectKey,
      mimeType: input.mimeType,
      fileSizeBytes: input.file.length,
      uploadedById: null,
      notes: "Customer reference image (/create)",
    })
    .returning();

  if (!row) {
    throw new Error("Failed to create customer upload asset");
  }

  await recordAuditEvent({
    ventureId: input.ventureId,
    actorUserId: null,
    action: "asset.customer_uploaded",
    entityType: "asset",
    entityId: row.id,
    metadata: { studioProjectId: input.studioProjectId },
  });

  return row;
}

export async function getAssetPreviewUrl(input: {
  bucket: string;
  objectKey: string;
}) {
  if (input.bucket === STORAGE_BUCKETS.productMedia) {
    return productMediaPublicUrl(input.objectKey);
  }

  return createSignedUrl({
    bucket: input.bucket,
    objectKey: input.objectKey,
  });
}

export async function createAssetWithUpload(input: {
  ventureId: string;
  ventureSlug: string;
  uploadedById: string;
  name: string;
  assetType: AssetType;
  file: Buffer | Uint8Array;
  filename: string;
  mimeType: string;
  notes?: string | null;
}) {
  const db = getDb();
  const assetId = crypto.randomUUID();
  const objectKey = designLibraryObjectKey(
    input.ventureSlug,
    assetId,
    input.filename,
  );

  await uploadToBucket({
    bucket: STORAGE_BUCKETS.designLibrary,
    objectKey,
    body: input.file,
    contentType: input.mimeType,
  });

  const [row] = await db
    .insert(asset)
    .values({
      id: assetId,
      ventureId: input.ventureId,
      name: input.name,
      assetType: input.assetType,
      status: "draft",
      bucket: STORAGE_BUCKETS.designLibrary,
      objectKey,
      mimeType: input.mimeType,
      fileSizeBytes: input.file.length,
      uploadedById: input.uploadedById,
      notes: input.notes ?? null,
    })
    .returning();

  if (!row) {
    throw new Error("Failed to create asset row");
  }

  await recordAuditEvent({
    ventureId: input.ventureId,
    actorUserId: input.uploadedById,
    action: "asset.created",
    entityType: "asset",
    entityId: row.id,
    metadata: { assetType: input.assetType, status: row.status },
  });

  logger.info("asset_created", { assetId: row.id, ventureId: input.ventureId });

  return row;
}

export async function approveAsset(input: {
  ventureId: string;
  assetId: string;
  approvedById: string;
}) {
  const db = getDb();
  const existing = await getAssetById({
    ventureId: input.ventureId,
    assetId: input.assetId,
  });

  if (existing.status === "archived") {
    throw new ValidationError("Cannot approve an archived asset");
  }

  if (isApprovedAssetStatus(existing.status as AssetStatus)) {
    return existing;
  }

  const now = new Date();
  const [row] = await db
    .update(asset)
    .set({
      status: "approved",
      approvedById: input.approvedById,
      approvedAt: now,
      updatedAt: now,
    })
    .where(
      and(eq(asset.id, input.assetId), eq(asset.ventureId, input.ventureId)),
    )
    .returning();

  if (!row) {
    throw new NotFoundError("Asset not found");
  }

  await recordAuditEvent({
    ventureId: input.ventureId,
    actorUserId: input.approvedById,
    action: "asset.approved",
    entityType: "asset",
    entityId: row.id,
    metadata: { previousStatus: existing.status },
  });

  logger.info("asset_approved", { assetId: row.id, ventureId: input.ventureId });

  await compoundPilOnAssetApprove({
    ventureId: input.ventureId,
    assetId: row.id,
    approvedByUserId: input.approvedById,
  });

  return row;
}

export async function archiveAsset(input: {
  ventureId: string;
  assetId: string;
  actorUserId: string;
  reason?: string | null;
}) {
  const db = getDb();
  await getAssetById({ ventureId: input.ventureId, assetId: input.assetId });

  const [row] = await db
    .update(asset)
    .set({
      status: "archived",
      updatedAt: new Date(),
    })
    .where(
      and(eq(asset.id, input.assetId), eq(asset.ventureId, input.ventureId)),
    )
    .returning();

  if (!row) {
    throw new NotFoundError("Asset not found");
  }

  await recordAuditEvent({
    ventureId: input.ventureId,
    actorUserId: input.actorUserId,
    action: "asset.archived",
    entityType: "asset",
    entityId: row.id,
    metadata: input.reason?.trim()
      ? { reason: input.reason.trim(), rejectedFromReview: true }
      : { rejectedFromReview: true },
  });

  return row;
}

export async function getAssetSignedUrl(input: {
  ventureId: string;
  assetId: string;
}) {
  const row = await getAssetById(input);

  return createSignedUrl({
    bucket: row.bucket,
    objectKey: row.objectKey,
  });
}
