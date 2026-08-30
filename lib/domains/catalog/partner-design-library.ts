import { and, desc, eq, inArray } from "drizzle-orm";
import {
  approveAsset,
  createAssetWithUpload,
  getAssetSignedUrl,
} from "@/lib/domains/assets/service";
import { getDb } from "@/lib/db/client";
import { asset } from "@/lib/db/schema";

export type PartnerLibraryDesign = {
  id: string;
  name: string;
  status: string;
  notes: string | null;
  createdAt: Date;
  previewUrl: string | null;
};

export async function listPartnerLibraryDesigns(
  ventureId: string,
): Promise<PartnerLibraryDesign[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(asset)
    .where(
      and(
        eq(asset.ventureId, ventureId),
        eq(asset.assetType, "sweetoh_design"),
        inArray(asset.status, ["draft", "approved", "licensed"]),
      ),
    )
    .orderBy(desc(asset.updatedAt));

  return Promise.all(
    rows.map(async (row) => ({
      id: row.id,
      name: row.name,
      status: row.status,
      notes: row.notes,
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
