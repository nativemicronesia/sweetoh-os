import { and, desc, eq } from "drizzle-orm";
import {
  getAssetSignedUrl,
} from "@/lib/domains/assets/service";
import { getDb } from "@/lib/db/client";
import { asset } from "@/lib/db/schema";

export type StudioLibraryDesign = {
  id: string;
  name: string;
  previewUrl: string | null;
};

/** Approved partner designs available for customers to place on a blank. */
export async function listApprovedDesignsForStudio(
  ventureId: string,
  limit = 24,
): Promise<StudioLibraryDesign[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(asset)
    .where(
      and(
        eq(asset.ventureId, ventureId),
        eq(asset.assetType, "sweetoh_design"),
        eq(asset.status, "approved"),
      ),
    )
    .orderBy(desc(asset.updatedAt))
    .limit(limit);

  return Promise.all(
    rows.map(async (row) => ({
      id: row.id,
      name: row.name,
      previewUrl: await getAssetSignedUrl({
        ventureId,
        assetId: row.id,
      }).catch(() => null),
    })),
  );
}
