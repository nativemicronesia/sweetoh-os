import Link from "next/link";
import { redirect } from "next/navigation";
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
import { ProductEditor, type CanvasBlankOption } from "./product-editor";
import { DESIGN_TYPES, designCanvasSurface, designTypeById, isStandaloneDesign, parseDesignSize, type DesignSize } from "@/lib/studio/design-canvas";
import { applyDesignToRegion } from "@/lib/studio/design-apply";
import { listActorProductDrafts } from "@/lib/domains/intelligence/service";
import { builderRecord } from "@/lib/domains/intelligence/product-research-schema";
import { defaultArea, inferSurfaceImageRole, regionsFor, studioMatchesProductPrintArea, type StudioLayout } from "@/lib/domains/catalog/studio-layout";

export const maxDuration = 180;

type PageProps = {
  searchParams: Promise<{ tpl?: string; new?: string; w?: string; h?: string; unit?: string; design?: string; blank?: string; composition?: string; template?: string; targetDraft?: string; returnTo?: string; orderId?: string; error?: string }>;
};

export default async function PartnerCanvasPage({ searchParams }: PageProps) {
  const session = await requirePartnerWorkspace();
  const query = await searchParams;
  // Studio is a workspace in its own right: with nothing to open, send people to its home.
  if (!query.new && !query.blank && !query.design && !query.composition && !query.template && !query.targetDraft) redirect("/partner/studio");
  let newSize: DesignSize | null = null;
  if (query.new) {
    const parsed = query.new === "custom"
      ? parseDesignSize({ width: query.w, height: query.h, unit: query.unit })
      : designTypeById(query.new) ? { size: designTypeById(query.new)!.size } : { error: "Choose a design type." };
    if ("error" in parsed) redirect(`/partner/studio?error=${encodeURIComponent(parsed.error)}`);
    newSize = parsed.size;
  }

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
  const savedIsStandalone = isStandaloneDesign(preparedCopy?.layout);
  const savedAsset = compositionId && savedIsStandalone ? await getAssetById({ ventureId: session.ventureId, assetId: compositionId }).catch(() => null) : null;
  // A standalone design opened with ?blank= is Product Design context: the design is applied to that product.
  const applyToProduct = savedIsStandalone && Boolean(query.template) && Boolean(query.blank);
  const standalone = Boolean(newSize) || (savedIsStandalone && !applyToProduct);
  let safeSavedStudio: StudioLayout | undefined = standalone && !savedIsStandalone ? undefined : preparedCopy?.layout;

  const editorBlanks = [
    ...blanks,
    ...privateProductDrafts.filter((draft) => !blanks.some((blank) => blank.id === draft.id)),
  ];
  const sourceBlank = editorBlanks.find((blank) => blank.id === (query.targetDraft ?? savedComposition?.blankProductId ?? query.blank)) ?? editorBlanks[0];
  let designBlank: CanvasBlankOption | null = null;
  if (standalone) {
    const artboard = savedIsStandalone ? preparedCopy!.layout.surfaces[0] : { ...designCanvasSurface(newSize!), layers: [] };
    safeSavedStudio = savedIsStandalone ? preparedCopy!.layout : { version: 1, surfaces: [artboard] };
    const { layers: _layers, ...geometry } = artboard;
    designBlank = { id: "design", name: "Design", imageUrl: null, printArea: { ...geometry.area, surfaces: [geometry] }, variantOptions: null, catalogSource: null };
  } else if (applyToProduct && sourceBlank && preparedCopy) {
    // Product Design context: the saved design is scaled onto this product's real print region.
    const productSurfaces = sourceBlank.printArea?.surfaces ?? [{ id: "front", name: "Front", position: "front", assetId: null, area: sourceBlank.printArea ?? defaultArea }];
    const region = regionsFor(productSurfaces[0])[0];
    safeSavedStudio = {
      version: 1,
      surfaces: productSurfaces.map((surface, index) => ({ ...surface, layers: index === 0 && region ? applyDesignToRegion(preparedCopy.layout.surfaces[0], region) : [] })),
    };
  }
  const designGeometry = safeSavedStudio ?? (sourceBlank?.printArea?.surfaces?.length
    ? { version: 1 as const, surfaces: sourceBlank.printArea.surfaces.map((surface) => ({ ...surface, layers: [] })) }
    : undefined);
  // Keep an explicitly requested draft selectable even when the saved design's
  // geometry has drifted. The editor can correct its existing surfaces; the
  // save action still refuses to apply until exact geometry and verified
  // production blanks match again.
  const compatibleProductDrafts = privateProductDrafts.filter((draft) =>
    draft.id === query.targetDraft || Boolean(designGeometry && studioMatchesProductPrintArea(designGeometry, draft.printArea))
  );
  const returnToProductId = compatibleProductDrafts.some((draft) => draft.id === query.targetDraft)
    ? query.targetDraft
    : null;
  const returnToOrderId = query.returnTo === "order" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(query.orderId ?? "")
    ? query.orderId
    : null;
  const returnHref = standalone || applyToProduct
    ? "/partner/studio"
    : returnToProductId
    ? `/partner/review/${returnToProductId}`
    : returnToOrderId
      ? `/partner/orders/${returnToOrderId}`
      : query.composition || query.template || query.design
      ? "/partner/library"
      : "/partner/catalog";
  const returnLabel = standalone || applyToProduct
    ? "Back to Studio"
    : returnToProductId
    ? "Back to product"
    : returnToOrderId
      ? "Back to order"
      : query.composition || query.template || query.design
      ? "Back to My files"
      : "Back to catalog";
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
    .map((item) => ({ id: item.id, name: item.name, previewUrl: item.previewUrl, kind: item.compositionKind }));
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

      {!standalone && editorBlanks.length === 0 ? (
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
          standalone={standalone}
          savedDesignId={standalone && savedIsStandalone && !query.template ? compositionId ?? null : null}
          blanks={designBlank ? [designBlank] : editorBlanks}
          designs={designOptions}
          creativeAssets={reusableAssets}
          savedDesigns={savedDesigns}
          privateProductDrafts={compatibleProductDrafts.map(({ id, name }) => ({ id, name }))}
          initialApplyTargetId={compatibleProductDrafts.some((draft) => draft.id === query.targetDraft) ? query.targetDraft ?? null : null}
          initialCompositionAssetId={query.composition ?? null}
          initialName={standalone
            ? (query.template ? `Copy of ${savedAsset?.name ?? "design"}` : savedAsset?.name ?? "Untitled design")
            : applyToProduct ? null
            : sourceDesign ? `Copy of ${sourceDesign.name}` : null}
          draftScope={query.template ? `template-${query.template}` : query.composition ? `composition-${query.composition}` : newSize ? `new-${query.new}-${newSize.width}x${newSize.height}${newSize.unit}${query.tpl ? `-${query.tpl}` : ""}` : "fresh"}
          initialTemplateId={newSize ? query.tpl ?? null : null}
          rightsFallbackNotice={fallbackNotice}
          initialDesignId={savedComposition?.designAssetId ?? query.design ?? null}
          initialBlankId={designBlank ? designBlank.id : query.targetDraft ?? savedComposition?.blankProductId ?? query.blank ?? null}
          returnHref={returnHref}
          returnLabel={returnLabel}
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
