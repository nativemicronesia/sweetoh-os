import Link from "next/link";
import { requirePartnerWorkspace } from "@/lib/domains/identity/service";
import {
  countPartnerSweetohJobs,
  statusesForPartnerStage,
} from "@/lib/domains/fulfillment";
import { listActorProductDrafts } from "@/lib/domains/intelligence/service";
import {
  isPartnerProductionJobStatus,
  listCustomerCustomizationRequests,
} from "@/lib/domains/studio";
import { resolvePartnerWorkspacePack } from "@/lib/domains/workspace/packs";
import { listProductsPendingReview } from "@/lib/domains/catalog/service";

export default async function PartnerStudioHubPage() {
  const session = await requirePartnerWorkspace();
  const pack = resolvePartnerWorkspacePack({
    role: session.role,
    ventureSlug: session.ventureSlug,
  });

  const [drafts, pending, approvedJobs, newOrders, readyToShip] =
    await Promise.all([
      listActorProductDrafts({
        ventureId: session.ventureId,
        actorUserId: session.appUser.id,
      }),
      listProductsPendingReview(session.ventureId),
      listCustomerCustomizationRequests(session.ventureId),
      countPartnerSweetohJobs({
        ventureId: session.ventureId,
        statuses: statusesForPartnerStage("new"),
      }),
      countPartnerSweetohJobs({
        ventureId: session.ventureId,
        statuses: statusesForPartnerStage("ready_to_ship"),
      }),
    ]);

  const openDrafts = drafts.filter(({ product }) => !product.active).length;
  const printJobs = approvedJobs.filter((p) =>
    isPartnerProductionJobStatus(p.status),
  ).length;

  const modeMeta: Record<
    string,
    { count: number; detail: string; hot: boolean }
  > = {
    create: {
      count: openDrafts,
      detail:
        openDrafts > 0
          ? `${openDrafts} open draft${openDrafts === 1 ? "" : "s"}`
          : "Start a new piece",
      hot: false,
    },
    print: {
      count: printJobs,
      detail:
        printJobs > 0
          ? `${printJobs} ready for your printers`
          : "Nothing queued to print",
      hot: printJobs > 0,
    },
    listings: {
      count: pending.length,
      detail:
        pending.length > 0
          ? `${pending.length} pending review`
          : "Drafts and live catalog",
      hot: pending.length > 0 && pack.id === "sweetoh_partner",
    },
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold" style={{ color: "var(--so-cream)" }}>
          Studio
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--so-cream-dim)" }}>
          Create · Print · Listings — shared POD desk for NMH ventures.
        </p>
      </div>

      <Link
        href={pack.primaryCta.href}
        className="flex flex-col gap-2 rounded-xl border px-5 py-5 transition-colors hover:border-[var(--so-gold-dim)]"
        style={{
          borderColor: "var(--so-gold-dim)",
          background: "rgba(201,168,76,0.1)",
        }}
      >
        <span className="text-sm font-medium" style={{ color: "var(--so-gold)" }}>
          {pack.primaryCta.label}
        </span>
        <span className="text-sm" style={{ color: "var(--so-cream)" }}>
          {pack.primaryCta.note}
        </span>
      </Link>

      <div className="grid gap-3 sm:grid-cols-3">
        {pack.studioModes.map((mode) => {
          const meta = modeMeta[mode.id] ?? {
            count: 0,
            detail: mode.note,
            hot: false,
          };
          return (
            <Link
              key={mode.id}
              href={mode.href}
              className="rounded-xl border p-5 transition-colors hover:border-[var(--so-gold-dim)]"
              style={{
                borderColor: meta.hot ? "var(--so-gold-dim)" : "var(--so-border)",
                background: meta.hot
                  ? "rgba(201,168,76,0.05)"
                  : "var(--so-dark)",
              }}
            >
              <p
                className="text-sm font-medium"
                style={{ color: meta.hot ? "var(--so-gold)" : "var(--so-cream)" }}
              >
                {mode.label}
              </p>
              <p
                className="mt-2 text-2xl font-bold"
                style={{ color: meta.hot ? "var(--so-gold)" : "var(--so-cream)" }}
              >
                {meta.count}
              </p>
              <p className="mt-1 text-xs" style={{ color: "var(--so-cream-dim)" }}>
                {meta.detail}
              </p>
            </Link>
          );
        })}
      </div>

      {pack.id === "sweetoh_partner" && (newOrders > 0 || readyToShip > 0) ? (
        <p className="text-sm" style={{ color: "var(--so-cream-dim)" }}>
          Ship needs you:{" "}
          <Link href="/partner/queue" className="underline" style={{ color: "var(--so-cream)" }}>
            {newOrders} new · {readyToShip} ready
          </Link>
        </p>
      ) : null}
    </div>
  );
}
