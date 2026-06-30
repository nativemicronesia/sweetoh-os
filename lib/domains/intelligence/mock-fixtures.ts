import { and, eq } from "drizzle-orm";
import { isMockAiEnabled } from "@/lib/config/env";
import { getDb } from "@/lib/db/client";
import { product } from "@/lib/db/schema";
import { approveAsset } from "@/lib/domains/assets/service";
import { addProductMediaUpload } from "@/lib/domains/catalog/service";

/** 1×1 PNG — minimal valid image for mock E2E publish fixtures */
export const MOCK_PLACEHOLDER_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

/** When AI_MOCK_MODE is on, attach publish gate fixtures so Approve works in E2E tests. */
export async function applyMockDraftPublishFixtures(input: {
  ventureId: string;
  ventureSlug: string;
  productId: string;
  actorUserId: string;
  fulfillmentType: "dropship" | "sweetoh";
  sourceAssetId?: string | null;
}) {
  if (!isMockAiEnabled()) {
    return;
  }

  const db = getDb();

  if (input.fulfillmentType === "dropship") {
    await db
      .update(product)
      .set({ supplierSku: "MOCK-E2E-SKU", updatedAt: new Date() })
      .where(
        and(
          eq(product.id, input.productId),
          eq(product.ventureId, input.ventureId),
        ),
      );
  }

  if (input.sourceAssetId) {
    await approveAsset({
      ventureId: input.ventureId,
      assetId: input.sourceAssetId,
      approvedById: input.actorUserId,
    });
  } else {
    await addProductMediaUpload({
      ventureId: input.ventureId,
      ventureSlug: input.ventureSlug,
      productId: input.productId,
      actorUserId: input.actorUserId,
      file: MOCK_PLACEHOLDER_PNG,
      filename: "mock-placeholder.png",
      mimeType: "image/png",
    });
  }
}
