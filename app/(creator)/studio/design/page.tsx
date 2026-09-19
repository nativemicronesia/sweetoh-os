import Link from "next/link";
import { LayoutGrid } from "lucide-react";
import { requireCreator } from "@/lib/domains/identity/service";
import { getAssetById, getAssetSignedUrl } from "@/lib/domains/assets/service";
import { listPartnerCatalog } from "@/lib/domains/catalog/partner-catalog";
import { getSavedComposition, listPartnerLibraryDesigns } from "@/lib/domains/catalog/partner-design-library";
import { getCreatorProfile, getCreditBalance } from "@/lib/domains/creator/credits";
import { isAcceptingRequests } from "@/lib/domains/creator/print-requests";
import { MascotCharacter } from "@/app/(store)/components/mascot-character";
import { CreatorEditor } from "./creator-editor";

export const metadata = { title: "Design" };
export const maxDuration = 180;

type PageProps = { searchParams: Promise<{ design?: string; blank?: string; composition?: string; error?: string }> };

export default async function CreatorDesignPage({ searchParams }: PageProps) {
  const session = await requireCreator();
  const query = await searchParams;
  const [blanks, designs, savedComposition, savedName, profile, { plan }, accepting] = await Promise.all([
    listPartnerCatalog(session).then((rows) => rows.filter((b) => Boolean(b.imageUrl))),
    listPartnerLibraryDesigns(session.ventureId),
    query.composition ? getSavedComposition({ ventureId: session.ventureId, assetId: query.composition }).catch(() => null) : Promise.resolve(null),
    query.composition ? getAssetById({ ventureId: session.ventureId, assetId: query.composition }).then((a) => a.name).catch(() => null) : Promise.resolve(null),
    getCreatorProfile(session.appUser.id),
    getCreditBalance(session.appUser.id),
    isAcceptingRequests().catch(() => false),
  ]);

  if (!blanks.length) {
    return (
      <div className="cs" style={{ minHeight: "100dvh", display: "grid", placeItems: "center", padding: 24 }}>
        <div className="cs-empty" style={{ maxWidth: 480, background: "white" }}>
          <MascotCharacter size={64} />
          <h3>Pick a product to design on</h3>
          <p className="cs-muted" style={{ marginBottom: 16 }}>Choose a tee, hoodie, mug or anything else from the catalog — it opens right here in the Studio.</p>
          <Link href="/studio/catalog" className="cs-btn cs-btn-primary"><LayoutGrid size={16} /> Browse the catalog</Link>
        </div>
      </div>
    );
  }

  const savedDesigns = designs.filter((d) => d.isComposition).slice(0, 24).map((d) => ({ id: d.id, name: d.name, previewUrl: d.previewUrl }));
  const designOptions = designs
    .filter((d) => !d.isComposition && !/^(print-file|mockup):/.test(d.notes ?? ""))
    .map((d) => ({ id: d.id, name: d.name, previewUrl: d.previewUrl }));
  const surfaceIds = new Set(
    [
      ...blanks.flatMap((b) => b.printArea?.surfaces?.map((s) => s.assetId) ?? []),
      ...(savedComposition?.studio?.surfaces.flatMap((s) => [s.assetId, ...s.layers.flatMap((l) => (l.kind === "image" || l.kind === "pattern" ? [l.assetId] : []))]) ?? []),
    ].filter((id): id is string => Boolean(id)),
  );
  const surfaceImages = Object.fromEntries(
    (await Promise.all([...surfaceIds].map(async (id) => [id, await getAssetSignedUrl({ ventureId: session.ventureId, assetId: id }).catch(() => null)] as const))).filter(
      (e): e is readonly [string, string] => Boolean(e[1]),
    ),
  );

  return (
    <>
      {query.error && <p className="cs-alert" role="alert" style={{ position: "fixed", top: 72, left: "50%", transform: "translateX(-50%)", zIndex: 60 }}>{query.error}</p>}
      <CreatorEditor
        publish={{ printifyShop: profile?.printifyShopId ? profile.printifyShopTitle ?? "your Printify shop" : null, acceptingRequests: accepting, canRequestPrint: plan.id !== "free", planName: plan.name }}
        initialName={savedComposition ? savedName : null}
        initialStudio={savedComposition?.studio}
        surfaceImages={surfaceImages}
        blanks={blanks}
        designs={designOptions}
        savedDesigns={savedDesigns}
        initialDesignId={savedComposition?.designAssetId ?? query.design ?? null}
        initialBlankId={savedComposition?.blankProductId ?? query.blank ?? null}
        initialTransform={
          savedComposition
            ? { offsetX: savedComposition.offsetX, offsetY: savedComposition.offsetY, scale: savedComposition.scale, rotation: savedComposition.rotation, text: savedComposition.text }
            : null
        }
      />
    </>
  );
}
