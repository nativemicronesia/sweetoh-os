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
import {
  partnerProductWorkspaceLabel,
  partnerProductNextAction,
  partnerProductWorkspaceState,
} from "@/lib/domains/catalog/partner-product-workspace";

type ProductCard = {
  id: string;
  name: string;
  priceCents: number | null;
  image: string | null;
  ownership: "yours" | "shop";
  state: "private" | "ready" | "live" | "review" | "blank" | "archived" | "shop";
  stateLabel: string;
  href: string;
  actionLabel: string;
  builderHref: string | null;
};

export default async function PartnerProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string; state?: string }>;
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
  const cards: ProductCard[] = await Promise.all(
    rows
      .filter(({ product }) => product.draftStatus !== "archived")
        .map(async ({ product, session: draft }) => {
        const record = builderRecord(draft?.rawResponse);
        const state = partnerProductWorkspaceState({
          active: product.active,
          draftStatus: product.draftStatus,
          isBlank: record?.purpose === "blank",
        });
        const nextAction = partnerProductNextAction({
          id: product.id,
          state,
          confirmedBlank: Boolean(record?.purpose === "blank" && record.confirmed),
        });
        const assetId = record?.mockupAssetId || product.sourceAssetId;
        const image = assetId
          ? await getAssetSignedUrl({ ventureId: session.ventureId, assetId })
          : await getPrimaryProductImageUrl(product.id);
        return {
          id: product.id,
          name: product.name,
          priceCents: product.priceCents > 0 ? product.priceCents : null,
          image,
          ownership: "yours" as const,
          state,
          href: nextAction.href,
          actionLabel: nextAction.label,
          stateLabel: partnerProductWorkspaceLabel(state),
          builderHref: record && record.purpose !== "blank" && !product.active ? `/partner/builder/${product.id}` : null,
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
          priceCents: p.priceCents > 0 ? p.priceCents : null,
          image: await getPrimaryProductImageUrl(p.id),
          ownership: "shop" as const,
          state: "shop" as const,
          stateLabel: "Published shop listing",
          href: `/partner/review/${p.id}`,
          actionLabel: "Inspect listing",
          builderHref: null,
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
          <p>Your products grouped by what you can do next. Drafts stay private; ready products still need your publish action.</p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link className="studio-primary" href="/partner/list">
            ＋ Add a product I already make
          </Link>
          <Link className="pe-btn pe-btn-ghost" href="/partner/catalog">
            Design a new one
          </Link>
        </div>
      </header>
      <WorkspaceGallery cards={cards} initialFilter={query.state} />
    </div>
  );
}
