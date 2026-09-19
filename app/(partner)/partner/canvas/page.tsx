import Link from "next/link";
import { getAssetSignedUrl } from "@/lib/domains/assets/service";
import { listPartnerCatalog } from "@/lib/domains/catalog/partner-catalog";
import { FlashBanner } from "@/app/(owner)/owner/components/flash-banner";
import {
  getSavedComposition,
  listPartnerLibraryDesigns,
} from "@/lib/domains/catalog/partner-design-library";
import { requirePartnerWorkspace } from "@/lib/domains/identity/service";
import { ProductEditor } from "./product-editor";

export const maxDuration = 180;

type PageProps = {
  searchParams: Promise<{ design?: string; blank?: string; composition?: string; error?: string }>;
};

export default async function PartnerCanvasPage({ searchParams }: PageProps) {
  const session = await requirePartnerWorkspace();
  const query = await searchParams;

  const [blanks, designs, savedComposition] = await Promise.all([
    listPartnerCatalog(session).then(rows => rows.filter(b => Boolean(b.imageUrl))),
    listPartnerLibraryDesigns(session.ventureId),
    query.composition
      ? getSavedComposition({ ventureId: session.ventureId, assetId: query.composition })
      : Promise.resolve(null),
  ]);

  const designOptions = designs
    .filter((item) => !item.isComposition && (item.status === "approved" || item.status === "licensed" || item.status === "draft"))
    .map((item) => ({
      id: item.id,
      name: item.name,
      previewUrl: item.previewUrl,
    }));

  const surfaceIds = new Set([
    ...blanks.flatMap(b => b.printArea?.surfaces?.map(s=>s.assetId) ?? []),
    ...(savedComposition?.studio?.surfaces.flatMap(s=>[s.assetId, ...s.layers.flatMap(l=>l.kind === "image" ? [l.assetId] : [])]) ?? []),
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
          initialStudio={savedComposition?.studio}
          surfaceImages={Object.fromEntries(Object.entries(surfaceImages).filter((entry): entry is [string,string]=>Boolean(entry[1])))}
          blanks={blanks}
          designs={designOptions}
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
