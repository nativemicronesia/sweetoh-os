import Link from "next/link";
import { FlashBanner } from "@/app/(owner)/owner/components/flash-banner";
import {
  listFulfillmentJobs,
  statusesForPartnerStage,
} from "@/lib/domains/fulfillment";
import {
  PARTNER_QUEUE_STAGES,
  parsePartnerQueueStage,
} from "@/lib/domains/fulfillment/scopes";
import { requirePartnerWorkspace } from "@/lib/domains/identity/service";
import { getStudioProjectImages } from "@/lib/domains/studio/images";
import {
  isPartnerProductionJobStatus,
  listCustomerCustomizationRequests,
} from "@/lib/domains/studio";
import { uploadApprovedJobImageAction } from "../actions/studio";
import { PartnerJobCard } from "../partner-job-card";

/**
 * One orders board, two tabs — not two apps.
 *
 * Custom: storefront customization requests on the press
 * (`listCustomerCustomizationRequests` + production image upload).
 * Catalog: Sweet'Oh fulfillment jobs by stage (`listFulfillmentJobs`).
 */

type PartnerOrdersPageProps = {
  searchParams: Promise<{
    tab?: string;
    stage?: string;
    error?: string;
    success?: string;
  }>;
};

type OrdersTab = "custom" | "catalog";

function parseTab(value: string | undefined): OrdersTab {
  return value === "custom" ? "custom" : "catalog";
}

export default async function PartnerOrdersPage({
  searchParams,
}: PartnerOrdersPageProps) {
  const session = await requirePartnerWorkspace();
  const query = await searchParams;
  const tab = parseTab(query.tab);
  const stage = parsePartnerQueueStage(query.stage);

  const [catalogJobs, customRequests] = await Promise.all([
    listFulfillmentJobs({
      ventureId: session.ventureId,
      path: "sweetoh",
      statuses: statusesForPartnerStage(stage),
    }),
    listCustomerCustomizationRequests(session.ventureId),
  ]);

  const productionJobs = customRequests.filter((project) =>
    isPartnerProductionJobStatus(project.status),
  );

  const jobsWithImages =
    tab === "custom"
      ? await Promise.all(
          productionJobs.map(async (project) => ({
            project,
            images: await getStudioProjectImages({
              ventureId: session.ventureId,
              projectId: project.id,
            }),
          })),
        )
      : [];

  const tabs: { id: OrdersTab; label: string; count: number }[] = [
    { id: "catalog", label: "Catalog orders", count: catalogJobs.length },
    { id: "custom", label: "Custom jobs", count: productionJobs.length },
  ];

  return (
    <div className="space-y-6">
      <FlashBanner message={query.error} variant="error" />
      <FlashBanner message={query.success} variant="success" />

      <div>
        <h1 className="text-xl font-semibold" style={{ color: "var(--so-cream)" }}>
          Orders
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--so-cream-dim)" }}>
          Everything moving through the shop — customer customization jobs on the
          press, and catalog orders out the door.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 text-sm">
        {tabs.map((item) => {
          const active = item.id === tab;
          return (
            <Link
              key={item.id}
              href={`/partner/orders?tab=${item.id}`}
              className="rounded-full px-4 py-1.5 transition-colors"
              style={
                active
                  ? { background: "var(--so-gold)", color: "var(--so-ink)" }
                  : {
                      border: "1px solid var(--so-border)",
                      color: "var(--so-cream-dim)",
                    }
              }
            >
              {item.label} ({item.count})
            </Link>
          );
        })}
      </div>

      {tab === "catalog" ? (
        <>
          <div className="flex flex-wrap gap-2 text-sm">
            {PARTNER_QUEUE_STAGES.map((item) => {
              const active = item.stage === stage;
              return (
                <Link
                  key={item.stage}
                  href={item.href}
                  className="rounded-full px-3 py-1 text-xs transition-colors"
                  style={
                    active
                      ? {
                          background: "var(--so-surface)",
                          color: "var(--so-gold)",
                        }
                      : {
                          border: "1px solid var(--so-border)",
                          color: "var(--so-cream-dim)",
                        }
                  }
                >
                  {item.label}
                </Link>
              );
            })}
          </div>

          <section
            className="rounded-xl border"
            style={{ borderColor: "var(--so-border)", background: "var(--so-dark)" }}
          >
            {catalogJobs.length === 0 ? (
              <p className="px-6 py-8 text-sm" style={{ color: "var(--so-cream-dim)" }}>
                No orders in this stage.
              </p>
            ) : (
              <ul className="divide-y" style={{ borderColor: "var(--so-border)" }}>
                {catalogJobs.map(({ job, lineItem, order }) => (
                  <li key={job.id} className="px-6 py-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Link
                        href={`/partner/orders/${job.id}`}
                        className="font-medium hover:underline"
                        style={{ color: "var(--so-gold)" }}
                      >
                        {lineItem.productName} × {lineItem.quantity}
                      </Link>
                      <span className="text-sm" style={{ color: "var(--so-cream-dim)" }}>
                        {job.status.replaceAll("_", " ")}
                      </span>
                    </div>
                    <p className="mt-1 text-sm" style={{ color: "var(--so-cream-dim)" }}>
                      {order.customerEmail} ·{" "}
                      {new Date(order.createdAt).toLocaleString()}
                      {job.trackingNumber ? ` · ${job.trackingNumber}` : ""}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      ) : (
        <section
          className="rounded-xl border"
          style={{ borderColor: "var(--so-border)", background: "var(--so-dark)" }}
        >
          {jobsWithImages.length === 0 ? (
            <p className="px-6 py-10 text-sm" style={{ color: "var(--so-cream-dim)" }}>
              Nothing on the press yet. When a customization request is ready for
              production, it shows up here.
            </p>
          ) : (
            <ul className="divide-y" style={{ borderColor: "var(--so-border)" }}>
              {jobsWithImages.map(({ project, images }) => (
                <PartnerJobCard
                  key={project.id}
                  job={project}
                  imageSet={images}
                  uploadProductionImageAction={uploadApprovedJobImageAction}
                />
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
