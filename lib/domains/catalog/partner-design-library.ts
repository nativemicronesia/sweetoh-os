import { and, desc, eq, inArray } from "drizzle-orm";
import {
  approveAsset,
  createAssetWithUpload,
  getAssetById,
  getAssetSignedUrl,
  type AssetCompositionLayout,
} from "@/lib/domains/assets/service";
import { getDb } from "@/lib/db/client";
import { asset } from "@/lib/db/schema";
import { isStandaloneDesign } from "@/lib/studio/design-canvas";
import { creativeLibraryEntry } from "@/lib/db/schema";
import { canUseCreativeLibraryAsset, type CreativeLibraryMetadata } from "@/lib/domains/library/model";
import { normalizeCreativeLibraryAsset, registerCreativeLibraryEntry } from "@/lib/domains/library/service";

export type { AssetCompositionLayout };

export type PartnerLibraryDesign = {
  id: string;
  name: string;
  status: string;
  notes: string | null;
  createdAt: Date;
  previewUrl: string | null;
  /** Saved from the partner Canvas with its placement — reopenable for editing. */
  isComposition: boolean;
  /** "standalone" = made in Studio with no product; "product" = composed on a product blank. */
  compositionKind: "standalone" | "product" | null;
  libraryMetadata: CreativeLibraryMetadata | null;
};

export async function listPartnerLibraryDesigns(
  ventureId: string,
): Promise<PartnerLibraryDesign[]> {
  const db = getDb();
  const rows = await db
    .select({ asset, entry: creativeLibraryEntry })
    .from(asset)
    .leftJoin(creativeLibraryEntry, eq(creativeLibraryEntry.assetId, asset.id))
    .where(
      and(
        eq(asset.ventureId, ventureId),
        eq(asset.assetType, "sweetoh_design"),
        inArray(asset.status, ["draft", "approved", "licensed"]),
      ),
    )
    .orderBy(desc(asset.updatedAt));

  return Promise.all(
    rows.filter(row => canUseCreativeLibraryAsset(normalizeCreativeLibraryAsset(row.asset, row.entry), { ventureId, use: "studio_edit" })).map(async ({ asset: row, entry }) => ({
      id: row.id,
      name: row.name,
      status: row.status,
      notes: row.notes,
      isComposition: row.compositionLayout != null,
      compositionKind: row.compositionLayout == null ? null : isStandaloneDesign(row.compositionLayout.studio) ? "standalone" as const : "product" as const,
      libraryMetadata: normalizeCreativeLibraryAsset(row, entry).metadata,
      createdAt: row.createdAt,
      previewUrl: await getAssetSignedUrl({
        ventureId,
        assetId: row.id,
      }).catch(() => null),
    })),
  );
}

export async function uploadPartnerDesign(input: {
  ventureId: string;
  ventureSlug: string;
  uploadedById: string;
  name: string;
  notes: string | null;
  file: Buffer;
  filename: string;
  mimeType: string;
  /** Partner/owner designs go live for customer Studio immediately. */
  autoApprove: boolean;
  /** Set when this upload is a Canvas composition export — lets it be reopened for editing. */
  compositionLayout?: AssetCompositionLayout | null;
}) {
  const created = await createAssetWithUpload({
    ventureId: input.ventureId,
    ventureSlug: input.ventureSlug,
    uploadedById: input.uploadedById,
    name: input.name,
    assetType: "sweetoh_design",
    file: input.file,
    filename: input.filename,
    mimeType: input.mimeType,
    notes: input.notes,
    compositionLayout: input.compositionLayout ?? null,
  });

  await registerCreativeLibraryEntry({
    ventureId: input.ventureId,
    assetId: created.id,
    metadata: {
      kind: input.mimeType === "image/svg+xml" ? "vector" : "illustration",
      category: "Artwork", tags: [], productionMethods: [], sourceKind: "partner_upload",
      sourceName: "Partner workspace upload", sourceUrl: null, evidenceUrl: null,
      licenseId: null, licenseUrl: null, commercialUse: false, modificationAllowed: false,
      redistributionAllowed: false, attributionRequired: false, attributionText: null,
      rightsVerifiedAt: null, rightsVerifiedById: null,
    },
  });

  if (input.autoApprove) {
    return approveAsset({
      ventureId: input.ventureId,
      assetId: created.id,
      approvedById: input.uploadedById,
    });
  }

  return created;
}

/** Reload a previously-saved Canvas composition's placement, for reopening it in the editor. */
export async function getSavedComposition(input: {
  ventureId: string;
  assetId: string;
}): Promise<AssetCompositionLayout | null> {
  const row = await getAssetById(input);
  return row.compositionLayout ?? null;
}
