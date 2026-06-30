import Link from "next/link";
import { requireRole } from "@/lib/domains/identity/service";
import {
  countPartnerSweetohJobs,
  statusesForPartnerStage,
} from "@/lib/domains/fulfillment";
import { PARTNER_QUEUE_STAGES } from "@/lib/domains/fulfillment/scopes";
import { listActorProductDrafts } from "@/lib/domains/intelligence/service";
import { REVIEW_QUEUE_DRAFT_STATUSES } from "@/lib/domains/catalog/draft-status";
import { listAssets } from "@/lib/domains/assets/service";
import {
  isPartnerProductionJobStatus,
  listCustomerCustomizationRequests,
} from "@/lib/domains/studio";

export default async function PartnerDashboard() {
  const session = await requireRole("partner");

  const [queueCounts, approvedJobs, uploads, drafts] = await Promise.all([
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
    listAssets({ ventureId: session.ventureId, uploadedById: session.appUser.id }),
    listActorProductDrafts({ ventureId: session.ventureId, actorUserId: session.appUser.id }),
  ]);

  const newOrders = queueCounts.find((s) => s.stage === "new")?.count ?? 0;
  const inProduction = queueCounts.find((s) => s.stage === "in_production")?.count ?? 0;
  const readyToShip = queueCounts.find((s) => s.stage === "ready_to_ship")?.count ?? 0;
  const productionJobs = approvedJobs.filter((p) => isPartnerProductionJobStatus(p.status)).length;
  const pendingDrafts = drafts.filter(({ product }) =>
    REVIEW_QUEUE_DRAFT_STATUSES.includes(product.draftStatus),
  ).length;
  const myUploads = uploads.filter((a) => a.assetType === "sweetoh_design").length;

  const needsAction = newOrders > 0 || readyToShip > 0 || productionJobs > 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold" style={{ color: "var(--so-cream)" }}>
          Good to see you
          {session.appUser.name ? `, ${session.appUser.name.split(" ")[0]}` : ""}.
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--so-cream-dim)" }}>
          Here&apos;s what needs your attention today.
        </p>
      </div>

      {/* Action alert — only when something needs doing */}
      {needsAction && (
        <div
          className="rounded-xl border px-5 py-4"
          style={{ borderColor: "var(--so-gold-dim)", background: "rgba(201,168,76,0.07)" }}
        >
          <p className="text-sm font-medium" style={{ color: "var(--so-gold)" }}>
            Action needed
          </p>
          <ul className="mt-2 space-y-1 text-sm" style={{ color: "var(--so-cream-dim)" }}>
            {newOrders > 0 && (
              <li>
                <Link href="/partner/queue?stage=new" className="hover:underline" style={{ color: "var(--so-cream)" }}>
                  {newOrders} new {newOrders === 1 ? "order" : "orders"} waiting →
                </Link>
              </li>
            )}
            {productionJobs > 0 && (
              <li>
                <Link href="/partner/jobs" className="hover:underline" style={{ color: "var(--so-cream)" }}>
                  {productionJobs} production {productionJobs === 1 ? "job" : "jobs"} to complete →
                </Link>
              </li>
            )}
            {readyToShip > 0 && (
              <li>
                <Link href="/partner/queue?stage=ready_to_ship" className="hover:underline" style={{ color: "var(--so-cream)" }}>
                  {readyToShip} {readyToShip === 1 ? "order" : "orders"} ready to ship →
                </Link>
              </li>
            )}
          </ul>
        </div>
      )}

      {/* Pipeline strip */}
      <div>
        <p className="mb-3 text-xs font-medium uppercase tracking-widest" style={{ color: "var(--so-cream-dim)" }}>
          Pipeline
        </p>
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: "New", count: newOrders, href: "/partner/queue?stage=new", hot: newOrders > 0 },
            { label: "In Production", count: inProduction, href: "/partner/queue?stage=in_production", hot: false },
            { label: "Ready to Ship", count: readyToShip, href: "/partner/queue?stage=ready_to_ship", hot: readyToShip > 0 },
            { label: "Jobs", count: productionJobs, href: "/partner/jobs", hot: productionJobs > 0 },
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

      {/* Quick actions */}
      <div>
        <p className="mb-3 text-xs font-medium uppercase tracking-widest" style={{ color: "var(--so-cream-dim)" }}>
          Quick actions
        </p>
        <div className="grid grid-cols-3 gap-3">
          <Link
            href="/partner/queue?stage=new"
            className="group flex flex-col gap-2 rounded-xl border p-4 transition-colors hover:border-[var(--so-gold-dim)]"
            style={{ borderColor: "var(--so-border)", background: "var(--so-dark)" }}
          >
            <span className="text-xl">▦</span>
            <span className="text-sm font-medium" style={{ color: "var(--so-cream)" }}>Pick up an order</span>
            <span className="text-xs" style={{ color: "var(--so-cream-dim)" }}>Start working a new Sweet&apos;Oh request</span>
          </Link>

          <Link
            href="/partner/uploads"
            className="group flex flex-col gap-2 rounded-xl border p-4 transition-colors hover:border-[var(--so-gold-dim)]"
            style={{ borderColor: "var(--so-border)", background: "var(--so-dark)" }}
          >
            <span className="text-xl">↑</span>
            <span className="text-sm font-medium" style={{ color: "var(--so-cream)" }}>Upload a design</span>
            <span className="text-xs" style={{ color: "var(--so-cream-dim)" }}>
              {myUploads > 0 ? `${myUploads} uploaded so far` : "Submit design files for review"}
            </span>
          </Link>

          <Link
            href="/partner/drafts"
            className="group flex flex-col gap-2 rounded-xl border p-4 transition-colors hover:border-[var(--so-gold-dim)]"
            style={{ borderColor: "var(--so-border)", background: "var(--so-dark)" }}
          >
            <span className="text-xl">◻</span>
            <span className="text-sm font-medium" style={{ color: "var(--so-cream)" }}>My drafts</span>
            <span className="text-xs" style={{ color: "var(--so-cream-dim)" }}>
              {pendingDrafts > 0 ? `${pendingDrafts} awaiting owner review` : "All caught up"}
            </span>
          </Link>
        </div>
      </div>

      {/* Status footer */}
      {!needsAction && (
        <div
          className="rounded-xl border px-5 py-4 text-sm"
          style={{ borderColor: "var(--so-border)", background: "var(--so-dark)", color: "var(--so-cream-dim)" }}
        >
          All clear — no immediate action needed. Check back when new orders come in.
        </div>
      )}
    </div>
  );
}
