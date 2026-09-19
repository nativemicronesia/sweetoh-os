import { cache } from "react";
import type { SessionUser } from "@/lib/domains/identity/types";
import { listBuilderBlanks } from "@/lib/domains/intelligence/partner-builder";
import { getAssetById } from "@/lib/domains/assets/service";
import { listActiveProducts, getPrimaryProductImageUrl } from "./service";

/** Local catalog remains available without any external catalog provider. */
export const listPartnerCatalog = cache(async (session: SessionUser) => {
  const [saved, products] = await Promise.all([
    listBuilderBlanks(session),
    listActiveProducts(session.ventureId),
  ]);
  const catalog = await Promise.all(
    products
      .filter(
        (p) =>
          p.fulfillmentType === "sweetoh" && !saved.some((b) => b.id === p.id),
      )
      .map(async (p) => {
        const source = p.sourceAssetId
          ? await getAssetById({
              ventureId: session.ventureId,
              assetId: p.sourceAssetId,
            })
          : null;
        // Launch seed images are solid-color fixtures, not usable product mockups.
        const placeholder = source?.notes === "Sweet'Oh launch seed design";
        return {
          id: p.id,
          name: p.name,
          category: p.category,
          description: p.description,
          printArea: p.printArea,
          variantOptions: p.variantOptions,
          catalogSource: p.catalogSource,
          imageUrl: placeholder ? null : await getPrimaryProductImageUrl(p.id),
        };
      }),
  );
  return [...saved, ...catalog];
});
