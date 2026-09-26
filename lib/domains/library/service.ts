import { and, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { asset, creativeLibraryEntry } from "@/lib/db/schema";
import { getAssetById } from "@/lib/domains/assets/service";
import { ValidationError } from "@/lib/shared/errors";
import { canUseCreativeLibraryAsset, creativeLibraryMetadataSchema, libraryKindForAssetType, matchesCreativeLibraryQuery, type CreativeLibraryAsset, type CreativeLibraryMetadata, type LibraryUse } from "./model";

function toMetadata(row: typeof creativeLibraryEntry.$inferSelect | null): CreativeLibraryMetadata | null {
  if (!row) return null;
  const parsed = creativeLibraryMetadataSchema.safeParse({
    kind: row.kind, category: row.category, tags: row.tags, productionMethods: row.productionMethods,
    sourceKind: row.sourceKind, sourceName: row.sourceName, sourceUrl: row.sourceUrl, evidenceUrl: row.evidenceUrl,
    licenseId: row.licenseId, licenseUrl: row.licenseUrl, commercialUse: row.commercialUse,
    modificationAllowed: row.modificationAllowed, redistributionAllowed: row.redistributionAllowed,
    attributionRequired: row.attributionRequired, attributionText: row.attributionText,
    rightsVerifiedAt: row.rightsVerifiedAt?.toISOString() ?? null, rightsVerifiedById: row.rightsVerifiedById,
  });
  return parsed.success ? parsed.data : null;
}

export function normalizeCreativeLibraryAsset(row: typeof asset.$inferSelect, metadataRow: typeof creativeLibraryEntry.$inferSelect | null): CreativeLibraryAsset {
  const metadata = toMetadata(metadataRow);
  return {
    assetId: row.id, ventureId: row.ventureId, ownerId: row.uploadedById, assetType: row.assetType,
    status: row.status, mimeType: row.mimeType, authorityLevel: row.authorityLevel, name: row.name, notes: row.notes,
    metadata: metadata ?? (metadataRow || row.authorityLevel === "licensed" ? null : {
      kind: libraryKindForAssetType(row.assetType), category: row.assetType.replaceAll("_", " "), tags: [], productionMethods: [],
      sourceKind: row.uploadedById ? "partner_upload" : "legacy_unknown", sourceName: row.uploadedById ? "Partner workspace upload" : "Existing SweetOh asset",
      sourceUrl: null, evidenceUrl: null, licenseId: null, licenseUrl: null, commercialUse: false, modificationAllowed: false,
      redistributionAllowed: false, attributionRequired: false, attributionText: null, rightsVerifiedAt: null, rightsVerifiedById: null,
    }),
    metadataInvalid: Boolean(metadataRow && !metadata),
  };
}

export async function getCreativeLibraryAsset(input: { ventureId: string; assetId: string }): Promise<CreativeLibraryAsset | null> {
  const db = getDb();
  const [row] = await db.select({ asset, entry: creativeLibraryEntry }).from(asset)
    .leftJoin(creativeLibraryEntry, eq(creativeLibraryEntry.assetId, asset.id))
    .where(and(eq(asset.id, input.assetId), eq(asset.ventureId, input.ventureId))).limit(1);
  return row ? normalizeCreativeLibraryAsset(row.asset, row.entry) : null;
}

export async function getCreativeLibraryAssets(input: { ventureId: string; assetIds: string[] }): Promise<CreativeLibraryAsset[]> {
  if (!input.assetIds.length) return [];
  const db = getDb();
  const rows = await db.select({ asset, entry: creativeLibraryEntry }).from(asset)
    .leftJoin(creativeLibraryEntry, eq(creativeLibraryEntry.assetId, asset.id))
    .where(and(eq(asset.ventureId, input.ventureId), inArray(asset.id, input.assetIds)));
  return rows.map(row => normalizeCreativeLibraryAsset(row.asset, row.entry));
}

/** Workspace-scoped search extension point for Studio and later SweetOh AI tools. */
export async function searchCreativeLibrary(input: { ventureId: string; query?: string; use: LibraryUse; kind?: CreativeLibraryMetadata["kind"]; limit?: number }): Promise<CreativeLibraryAsset[]> {
  const db = getDb();
  const rows = await db.select({ asset, entry: creativeLibraryEntry }).from(asset)
    .leftJoin(creativeLibraryEntry, eq(creativeLibraryEntry.assetId, asset.id))
    .where(eq(asset.ventureId, input.ventureId)).orderBy(desc(asset.updatedAt)).limit(500);
  return rows.map(row => normalizeCreativeLibraryAsset(row.asset, row.entry))
    .filter(row => canUseCreativeLibraryAsset(row, { ventureId: input.ventureId, use: input.use }))
    .filter(row => !input.kind || row.metadata?.kind === input.kind)
    .filter(row => matchesCreativeLibraryQuery(row, input.query ?? ""))
    .slice(0, Math.min(Math.max(input.limit ?? 30, 1), 100));
}

/** Attach classification/rights to the existing venture asset; online discovery alone never sets verified rights. */
export async function registerCreativeLibraryEntry(input: { ventureId: string; assetId: string; metadata: unknown }) {
  const metadata = creativeLibraryMetadataSchema.parse(input.metadata);
  await getAssetById({ ventureId: input.ventureId, assetId: input.assetId });
  const db = getDb();
  const verified = metadata.sourceKind !== "licensed_external" && Boolean(metadata.rightsVerifiedAt && metadata.rightsVerifiedById);
  const values = {
    assetId: input.assetId, ventureId: input.ventureId, kind: metadata.kind, category: metadata.category,
    tags: metadata.tags, productionMethods: metadata.productionMethods, sourceKind: metadata.sourceKind,
    sourceName: metadata.sourceName, sourceUrl: metadata.sourceUrl, evidenceUrl: metadata.evidenceUrl,
    licenseId: metadata.licenseId, licenseUrl: metadata.licenseUrl, commercialUse: metadata.commercialUse,
    modificationAllowed: metadata.modificationAllowed, redistributionAllowed: metadata.redistributionAllowed,
    attributionRequired: metadata.attributionRequired, attributionText: metadata.attributionText,
    rightsVerifiedAt: verified ? new Date(metadata.rightsVerifiedAt!) : null,
    rightsVerifiedById: verified ? metadata.rightsVerifiedById : null, updatedAt: new Date(),
  };
  const [row] = await db.insert(creativeLibraryEntry).values(values).onConflictDoUpdate({ target: creativeLibraryEntry.assetId, set: values }).returning();
  return row;
}

/** Only the partner/owner can assert externally sourced rights after checking the recorded evidence. */
export async function verifyExternalCreativeRights(input: { session: import("@/lib/domains/identity/types").SessionUser; assetId: string }) {
  if (input.session.role !== "partner" && input.session.role !== "owner") throw new ValidationError("Only the partner can verify external asset rights.");
  const db = getDb();
  const [row] = await db.select().from(creativeLibraryEntry).where(and(eq(creativeLibraryEntry.assetId, input.assetId), eq(creativeLibraryEntry.ventureId, input.session.ventureId))).limit(1);
  if (!row || row.sourceKind !== "licensed_external" || !row.sourceUrl || !row.licenseId || !row.evidenceUrl) throw new ValidationError("Record the original source, license, and rights evidence before verification.");
  const [updated] = await db.update(creativeLibraryEntry).set({ rightsVerifiedAt: new Date(), rightsVerifiedById: input.session.appUser.id, updatedAt: new Date() }).where(eq(creativeLibraryEntry.assetId, input.assetId)).returning();
  return updated;
}
