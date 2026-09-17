import Link from "next/link";
import { requirePartnerWorkspace } from "@/lib/domains/identity/service";
import { listActorProductDrafts } from "@/lib/domains/intelligence/service";
import { builderRecord } from "@/lib/domains/intelligence/product-research-schema";
import { getPrimaryProductImageUrl } from "@/lib/domains/catalog/service";
import { getAssetSignedUrl } from "@/lib/domains/assets/service";
import { WorkspaceGallery } from "./components/workspace-gallery";
import { OperationsOverview } from "./components/operations-overview";
export default async function PartnerOverviewPage() {
  const session = await requirePartnerWorkspace();
  if (session.role === "creator") return <OperationsOverview />;
  const rows = await listActorProductDrafts({ ventureId: session.ventureId, actorUserId: session.appUser.id });
  const cards = await Promise.all(rows.filter(({product}) => product.draftStatus !== "archived").map(async ({ product, session: draft }) => {
    const record = builderRecord(draft.rawResponse);
    const assetId = record?.mockupAssetId || product.sourceAssetId;
    const image = assetId ? await getAssetSignedUrl({ventureId: session.ventureId, assetId}) : await getPrimaryProductImageUrl(product.id);
    return { id: product.id, name: product.name, image, kind: record?.purpose === "blank" ? "blank" : product.active ? "live" : "draft", href: record ? `/partner/builder/${product.id}` : `/partner/review/${product.id}`, action: record?.purpose === "blank" && record.confirmed ? `/partner/canvas?blank=${product.id}` : null };
  }));
  return <div className="space-y-8"><header className="studio-page-heading"><div><h1>My products</h1><p>Create a product or pick up where you left off.</p></div><Link className="studio-primary" href="/partner/builder">＋ Create product</Link></header>
    <WorkspaceGallery cards={cards} />
    <div className="studio-operations"><Link href="/partner/activity" className="flex justify-between">Orders & workspace activity <span>→</span></Link></div>
  </div>;
}
