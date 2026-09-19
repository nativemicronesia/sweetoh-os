import { FlashBanner } from "@/app/(owner)/owner/components/flash-banner";
import Link from "next/link";
import { requirePartnerWorkspace } from "@/lib/domains/identity/service";
import { listActorProductDrafts } from "@/lib/domains/intelligence/service";
import { builderRecord } from "@/lib/domains/intelligence/product-research-schema";
import {
  getPrimaryProductImageUrl,
  listActiveProducts,
} from "@/lib/domains/catalog/service";
import { getAssetSignedUrl } from "@/lib/domains/assets/service";
import { WorkspaceGallery } from "../components/workspace-gallery";
export default async function PartnerProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  const session = await requirePartnerWorkspace();
  const [rows, published, query] = await Promise.all([
    listActorProductDrafts({
      ventureId: session.ventureId,
      actorUserId: session.appUser.id,
    }),
    listActiveProducts(session.ventureId),
    searchParams,
  ]);
  const cards = await Promise.all(
    rows
      .filter(({ product }) => product.draftStatus !== "archived")
      .map(async ({ product, session: draft }) => {
        const record = builderRecord(draft.rawResponse);
        const assetId = record?.mockupAssetId || product.sourceAssetId;
        const image = assetId
          ? await getAssetSignedUrl({ ventureId: session.ventureId, assetId })
          : await getPrimaryProductImageUrl(product.id);
        return {
          id: product.id,
          name: product.name,
          priceCents: product.priceCents,
          image,
          kind:
            record?.purpose === "blank"
              ? "blank"
              : product.active
                ? "live"
                : "draft",
          href: record
            ? `/partner/builder/${product.id}`
            : `/partner/review/${product.id}`,
          action:
            record?.purpose === "blank" && record.confirmed
              ? `/partner/canvas?blank=${product.id}`
              : null,
        };
      }),
  );
  const ownedIds = new Set(cards.map((c) => c.id));
  cards.push(
    ...(await Promise.all(
      published
        .filter((p) => !ownedIds.has(p.id))
        .map(async (p) => ({
          id: p.id,
          name: p.name,
          priceCents: p.priceCents,
          image: await getPrimaryProductImageUrl(p.id),
          kind: "live",
          href: `/partner/review/${p.id}`,
          action: null,
        })),
    )),
  );
  return (
    <div className="space-y-8">
      <FlashBanner message={query.success} variant="success" />
      <FlashBanner message={query.error} variant="error" />
      <header className="studio-page-heading">
        <div>
          <h1>My products</h1>
          <p>Everything you’ve made — drafts, published products and saved blanks.</p>
        </div>
        <Link className="studio-primary" href="/partner/catalog">
          ＋ Create product
        </Link>
      </header>
      <WorkspaceGallery cards={cards} />
    </div>
  );
}
