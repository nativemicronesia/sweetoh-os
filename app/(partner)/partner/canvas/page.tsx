import Link from "next/link";
import { getAssetSignedUrl } from "@/lib/domains/assets/service";
import { listPartnerCatalog } from "@/lib/domains/catalog/partner-catalog";
import { FlashBanner } from "@/app/(owner)/owner/components/flash-banner";
import {
  getSavedComposition,
  listPartnerLibraryDesigns,
} from "@/lib/domains/catalog/partner-design-library";
import { requirePartnerWorkspace } from "@/lib/domains/identity/service";
import { getCreativeLibraryAssets, searchCreativeLibrary } from "@/lib/domains/library/service";
import { canInsertCreativeLibraryAsset } from "@/lib/domains/library/model";
import { ProductEditor } from "./product-editor";

export const maxDuration = 180;

type PageProps = {
  searchParams: Promise<{ design?: string; blank?: string; composition?: string; error?: string }>;
};

export default async function PartnerCanvasPage({ searchParams }: PageProps) {
  const session = await requirePartnerWorkspace();
  const query = await searchParams;

  const [blanks, designs, savedComposition, creativeAssets] = await Promise.all([
    listPartnerCatalog(session).then(rows => rows.filter(b => Boolean(b.imageUrl))),
    listPartnerLibraryDesigns(session.ventureId),
    query.composition
      ? getSavedComposition({ ventureId: session.ventureId, assetId: query.composition })
      : Promise.resolve(null),
    searchCreativeLibrary({ ventureId: session.ventureId, use: "studio_edit", limit: 100 }),
  ]);

  const reusableAssets = await Promise.all(creativeAssets
    .filter(asset => canInsertCreativeLibraryAsset(asset, session.ventureId) && asset.metadata)
    .map(async asset => ({
      id: asset.assetId,
      name: asset.name,
      previewUrl: await getAssetSignedUrl({ ventureId: session.ventureId, assetId: asset.assetId }).catch(() => null),
      kind: asset.metadata!.kind,
      category: asset.metadata!.category,
      tags: asset.metadata!.tags,
      productionMethods: asset.metadata!.productionMethods,
      sourceName: asset.metadata!.sourceName,
      licenseId: asset.metadata!.licenseId,
    })))
    .then(items => items.filter((asset): asset is typeof asset & { previewUrl: string } => Boolean(asset.previewUrl)));

  const savedLayerIds = [...new Set(savedComposition?.studio?.surfaces.flatMap(surface => surface.layers.flatMap(layer => layer.kind === "image" || layer.kind === "pattern" ? [layer.assetId] : [])) ?? [])];
  const savedLayerAssets = await getCreativeLibraryAssets({ ventureId: session.ventureId, assetIds: savedLayerIds });
  const allowedSavedLayerIds = new Set(savedLayerAssets.filter(asset => canInsertCreativeLibraryAsset(asset, session.ventureId)).map(asset => asset.assetId));
  const safeSavedStudio = savedComposition?.studio ? {
    ...savedComposition.studio,
    surfaces: savedComposition.studio.surfaces.map(surface => ({
      ...surface,
      layers: surface.layers.filter(layer => (layer.kind !== "image" && layer.kind !== "pattern") || allowedSavedLayerIds.has(layer.assetId)),
    })),
  } : undefined;

  const savedDesigns = designs
    .filter((item) => item.isComposition)
    .slice(0, 24)
    .map((item) => ({ id: item.id, name: item.name, previewUrl: item.previewUrl }));
  const designOptions = designs
    .filter((item) => !item.isComposition && (item.status === "approved" || item.status === "licensed" || item.status === "draft"))
    .map((item) => ({
      id: item.id,
      name: item.name,
      previewUrl: item.previewUrl,
    }));

  const surfaceIds = new Set([
    ...blanks.flatMap(b => b.printArea?.surfaces?.flatMap(s=>[s.assetId, s.referenceAssetId]) ?? []),
    ...(safeSavedStudio?.surfaces.flatMap(s=>[s.assetId, s.referenceAssetId, ...s.layers.flatMap(l=>l.kind === "image" || l.kind === "pattern" ? [l.assetId] : [])]) ?? []),
  ].filter((id): id is string=>Boolean(id)));
  const surfaceImages = Object.fromEntries(await Promise.all([...surfaceIds].map(async id => [id, await getAssetSignedUrl({ventureId:session.ventureId,assetId:id})])));
  return (
    <div className="space-y-4">
      <FlashBanner message={query.error} variant="error" />

      {blanks.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--so-cream-dim)" }}>
          Start by preparing a reusable blank.{" "}
          <Link href="/partner/catalog" className="underline" style={{ color: "var(--so-cream)" }}>
            Add a blank
          </Link>{" "}
          — it stays private while you create.
        </p>
      ) : (
        <ProductEditor
          initialStudio={safeSavedStudio}
          surfaceImages={Object.fromEntries(Object.entries(surfaceImages).filter((entry): entry is [string,string]=>Boolean(entry[1])))}
          blanks={blanks}
          designs={designOptions}
          creativeAssets={reusableAssets}
          savedDesigns={savedDesigns}
          initialDesignId={savedComposition?.designAssetId ?? query.design ?? null}
          initialBlankId={savedComposition?.blankProductId ?? query.blank ?? null}
          initialTransform={
            savedComposition
              ? {
                  offsetX: savedComposition.offsetX,
                  offsetY: savedComposition.offsetY,
                  scale: savedComposition.scale,
                  rotation: savedComposition.rotation,
                  text: savedComposition.text,
                }
              : null
          }
        />
      )}
    </div>
  );
}
