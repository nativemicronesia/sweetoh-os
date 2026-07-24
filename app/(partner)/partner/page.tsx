import Link from "next/link";
import { requirePartnerWorkspace } from "@/lib/domains/identity/service";
import {
  countPartnerSweetohJobs,
  statusesForPartnerStage,
} from "@/lib/domains/fulfillment";
import { PARTNER_QUEUE_STAGES } from "@/lib/domains/fulfillment/scopes";
import { listActorProductDrafts } from "@/lib/domains/intelligence/service";
import { listActiveProducts } from "@/lib/domains/catalog/service";
import {
  isPartnerProductionJobStatus,
  listCustomerCustomizationRequests,
} from "@/lib/domains/studio";

export default async function PartnerDashboard() {
  const session = await requirePartnerWorkspace();

  const [queueCounts, approvedJobs, drafts, liveProducts] = await Promise.all([
    Promise.all(
      PARTNER_QUEUE_STAGES.map(async (item) => ({
        ...item,
        count: await countPartnerSweetohJobs({
          ventureId: session.ventureId,
          statuses: statusesForPartnerStage(item.stage),
        }),
      })),
    ),
    listCustomerCustomizationRequests(session.ventureId),
    listActorProductDrafts({
      ventureId: session.ventureId,
      actorUserId: session.appUser.id,
    }),
    listActiveProducts(session.ventureId),
  ]);

  const newOrders = queueCounts.find((s) => s.stage === "new")?.count ?? 0;
  const inProduction =
    queueCounts.find((s) => s.stage === "in_production")?.count ?? 0;
  const readyToShip =
    queueCounts.find((s) => s.stage === "ready_to_ship")?.count ?? 0;
  const productionJobs = approvedJobs.filter((p) =>
    isPartnerProductionJobStatus(p.status),
  ).length;
  const openDrafts = drafts.filter(({ product }) => !product.active).length;

  const needsAction = newOrders > 0 || readyToShip > 0 || productionJobs > 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold" style={{ color: "var(--so-cream)" }}>
          Good to see you
          {session.appUser.name ? `, ${session.appUser.name.split(" ")[0]}` : ""}.
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--so-cream-dim)" }}>
          Photograph what you made — Sweet&apos;Oh AI prepares the listing. You publish
          and fulfill.
        </p>
      </div>

      <Link
        href="/partner/visual-intake"
        className="flex flex-col gap-2 rounded-xl border px-5 py-5 transition-colors hover:border-[var(--so-gold-dim)]"
        style={{
          borderColor: "var(--so-gold-dim)",
          background: "rgba(201,168,76,0.1)",
        }}
      >
        <span className="text-sm font-medium" style={{ color: "var(--so-gold)" }}>
          New from photo
        </span>
        <span className="text-sm" style={{ color: "var(--so-cream)" }}>
          Snap a finished custom piece. AI builds the draft — you set the price and
          publish.
        </span>
      </Link>

      {needsAction ? (
        <div
          className="rounded-xl border px-5 py-4"
          style={{
            borderColor: "var(--so-gold-dim)",
            background: "rgba(201,168,76,0.07)",
          }}
        >
          <p className="text-sm font-medium" style={{ color: "var(--so-gold)" }}>
            Fulfillment needs you
          </p>
          <ul className="mt-2 space-y-1 text-sm" style={{ color: "var(--so-cream-dim)" }}>
            {newOrders > 0 ? (
              <li>
                <Link
                  href="/partner/queue?stage=new"
                  className="hover:underline"
                  style={{ color: "var(--so-cream)" }}
                >
                  {newOrders} new {newOrders === 1 ? "order" : "orders"} →
                </Link>
              </li>
            ) : null}
            {productionJobs > 0 ? (
              <li>
                <Link
                  href="/partner/jobs"
                  className="hover:underline"
                  style={{ color: "var(--so-cream)" }}
                >
                  {productionJobs} production{" "}
                  {productionJobs === 1 ? "job" : "jobs"} →
                </Link>
              </li>
            ) : null}
            {readyToShip > 0 ? (
              <li>
                <Link
                  href="/partner/queue?stage=ready_to_ship"
                  className="hover:underline"
                  style={{ color: "var(--so-cream)" }}
                >
                  {readyToShip} ready to ship →
                </Link>
              </li>
            ) : null}
          </ul>
        </div>
      ) : null}

      <div>
        <p
          className="mb-3 text-xs font-medium uppercase tracking-widest"
          style={{ color: "var(--so-cream-dim)" }}
        >
          Catalog
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {[
            {
              label: "Open drafts",
              count: openDrafts,
              href: "/partner/drafts",
              hot: openDrafts > 0,
            },
            {
              label: "Live products",
              count: liveProducts.length,
              href: "/partner/products",
              hot: false,
            },
            {
              label: "Orders",
              count: newOrders + inProduction + readyToShip,
              href: "/partner/queue",
              hot: newOrders + readyToShip > 0,
            },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-xl border p-4 transition-colors hover:border-[var(--so-gold-dim)]"
              style={{
                borderColor: item.hot ? "var(--so-gold-dim)" : "var(--so-border)",
                background: item.hot ? "rgba(201,168,76,0.05)" : "var(--so-dark)",
              }}
            >
              <p
                className="text-2xl font-bold"
                style={{ color: item.hot ? "var(--so-gold)" : "var(--so-cream)" }}
              >
                {item.count}
              </p>
              <p className="mt-1 text-xs" style={{ color: "var(--so-cream-dim)" }}>
                {item.label}
              </p>
            </Link>
          ))}
        </div>
      </div>

      <div>
        <p
          className="mb-3 text-xs font-medium uppercase tracking-widest"
          style={{ color: "var(--so-cream-dim)" }}
        >
          Production pipeline
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            {
              label: "New",
              count: newOrders,
              href: "/partner/queue?stage=new",
              hot: newOrders > 0,
            },
            {
              label: "In production",
              count: inProduction,
              href: "/partner/queue?stage=in_production",
              hot: false,
            },
            {
              label: "Ready to ship",
              count: readyToShip,
              href: "/partner/queue?stage=ready_to_ship",
              hot: readyToShip > 0,
            },
            {
              label: "Jobs",
              count: productionJobs,
              href: "/partner/jobs",
              hot: productionJobs > 0,
            },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-xl border p-4 transition-colors hover:border-[var(--so-gold-dim)]"
              style={{
                borderColor: item.hot ? "var(--so-gold-dim)" : "var(--so-border)",
                background: item.hot ? "rgba(201,168,76,0.05)" : "var(--so-dark)",
              }}
            >
              <p
                className="text-2xl font-bold"
                style={{ color: item.hot ? "var(--so-gold)" : "var(--so-cream)" }}
              >
                {item.count}
              </p>
              <p className="mt-1 text-xs" style={{ color: "var(--so-cream-dim)" }}>
                {item.label}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
