import Link from "next/link";
import { getAssetById, getAssetSignedUrl } from "@/lib/domains/assets/service";
import { listPartnerCatalog } from "@/lib/domains/catalog/partner-catalog";
import { FlashBanner } from "@/app/(owner)/owner/components/flash-banner";
import {
  getSavedComposition,
  listPartnerLibraryDesigns,
} from "@/lib/domains/catalog/partner-design-library";
import { requirePartnerWorkspace } from "@/lib/domains/identity/service";
import { getCreativeLibraryAssets, searchCreativeLibrary } from "@/lib/domains/library/service";
import { canInsertCreativeLibraryAsset } from "@/lib/domains/library/model";
import { prepareStudioTemplateCopy } from "@/lib/domains/catalog/studio-template-copy";
import { ProductEditor } from "./product-editor";
import { listActorProductDrafts } from "@/lib/domains/intelligence/service";
import { builderRecord } from "@/lib/domains/intelligence/product-research-schema";
import { inferSurfaceImageRole, studioMatchesProductPrintArea } from "@/lib/domains/catalog/studio-layout";

export const maxDuration = 180;

type PageProps = {
  searchParams: Promise<{ design?: string; blank?: string; composition?: string; template?: string; targetDraft?: string; error?: string }>;
};

export default async function PartnerCanvasPage({ searchParams }: PageProps) {
  const session = await requirePartnerWorkspace();
  const query = await searchParams;

  const compositionId = query.template ?? query.composition;
  const [blanks, ownDraftRows, designs, savedComposition, creativeAssets] = await Promise.all([
    listPartnerCatalog(session).then(rows => rows.filter(b => Boolean(b.imageUrl))),
    listActorProductDrafts({ ventureId: session.ventureId, actorUserId: session.appUser.id }),
    listPartnerLibraryDesigns(session.ventureId),
    compositionId
      ? getSavedComposition({ ventureId: session.ventureId, assetId: compositionId })
      : Promise.resolve(null),
    searchCreativeLibrary({ ventureId: session.ventureId, use: "studio_edit", limit: 100 }),
  ]);
  const editableProductRows = ownDraftRows
    .filter(({ product, session: draftSession }) => !product.active && product.fulfillmentType === "sweetoh"
      && ["draft", "needs_work", "pending_review", "approved"].includes(product.draftStatus)
      && builderRecord(draftSession?.rawResponse)?.purpose !== "blank"
      && Boolean(product.printArea?.surfaces?.length))
    .filter(({ product }, index, all) => all.findIndex((row) => row.product.id === product.id) === index);
  const privateProductDrafts = (await Promise.all(editableProductRows.map(async ({ product }) => {
    const surfaces = product.printArea?.surfaces ?? [];
    const productionAssets = await Promise.all(surfaces.map(async (surface) => surface.assetId
      ? getAssetById({ ventureId: session.ventureId, assetId: surface.assetId }).catch(() => null)
      : null));
    if (!surfaces.length || surfaces.some((surface, index) => inferSurfaceImageRole({ ...surface, assetNotes: productionAssets[index]?.notes }) !== "production_blank" || productionAssets[index]?.notes !== "Background removed; reusable blank view.")) return null;
    const front = surfaces[0];
    const imageUrl = front.assetId ? await getAssetSignedUrl({ ventureId: session.ventureId, assetId: front.assetId }).catch(() => null) : null;
    if (!imageUrl) return null;
    return { id: product.id, name: product.name, imageUrl, printArea: product.printArea, variantOptions: product.variantOptions, catalogSource: product.catalogSource };
  }))).filter((row): row is NonNullable<typeof row> => Boolean(row));
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
  const preparedCopy = savedComposition?.studio
    ? prepareStudioTemplateCopy(savedComposition.studio, allowedSavedLayerIds)
    : null;
  const safeSavedStudio = preparedCopy?.layout;

  const editorBlanks = [
    ...blanks,
    ...privateProductDrafts.filter((draft) => !blanks.some((blank) => blank.id === draft.id)),
  ];
  const sourceBlank = editorBlanks.find((blank) => blank.id === (query.targetDraft ?? savedComposition?.blankProductId ?? query.blank)) ?? editorBlanks[0];
  const designGeometry = safeSavedStudio ?? (sourceBlank?.printArea?.surfaces?.length
    ? { version: 1 as const, surfaces: sourceBlank.printArea.surfaces.map((surface) => ({ ...surface, layers: [] })) }
    : undefined);
  const compatibleProductDrafts = privateProductDrafts.filter((draft) => designGeometry && studioMatchesProductPrintArea(designGeometry, draft.printArea));
  const sourceDesign = query.template ? designs.find((design) => design.id === query.template) : null;
  const fallbackNotice = preparedCopy && (preparedCopy.removedAssetCount || preparedCopy.fontFallbackCount)
    ? [
        preparedCopy.removedAssetCount ? `${preparedCopy.removedAssetCount} image${preparedCopy.removedAssetCount === 1 ? " was" : "s were"} removed because current rights do not allow Studio use.` : "",
        preparedCopy.fontFallbackCount ? `${preparedCopy.fontFallbackCount} unavailable font${preparedCopy.fontFallbackCount === 1 ? " now uses" : "s now use"} Inter.` : "",
      ].filter(Boolean).join(" ")
    : null;

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
    ...editorBlanks.flatMap(b => b.printArea?.surfaces?.flatMap(s=>[s.assetId, s.referenceAssetId]) ?? []),
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
          blanks={editorBlanks}
          designs={designOptions}
          creativeAssets={reusableAssets}
          savedDesigns={savedDesigns}
          privateProductDrafts={compatibleProductDrafts.map(({ id, name }) => ({ id, name }))}
          initialApplyTargetId={compatibleProductDrafts.some((draft) => draft.id === query.targetDraft) ? query.targetDraft ?? null : null}
          initialCompositionAssetId={query.composition ?? null}
          initialName={sourceDesign ? `Copy of ${sourceDesign.name}` : null}
          draftScope={query.template ? `template-${query.template}` : query.composition ? `composition-${query.composition}` : "fresh"}
          rightsFallbackNotice={fallbackNotice}
          initialDesignId={savedComposition?.designAssetId ?? query.design ?? null}
          initialBlankId={query.targetDraft ?? savedComposition?.blankProductId ?? query.blank ?? null}
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
