import Link from "next/link";
import {
  listFulfillmentJobs,
  statusesForPartnerStage,
} from "@/lib/domains/fulfillment";
import {
  PARTNER_QUEUE_STAGES,
  parsePartnerQueueStage,
} from "@/lib/domains/fulfillment/scopes";
import { requirePartnerWorkspace } from "@/lib/domains/identity/service";

type PartnerQueuePageProps = {
  searchParams: Promise<{ stage?: string }>;
};

export default async function PartnerQueuePage({
  searchParams,
}: PartnerQueuePageProps) {
  const session = await requirePartnerWorkspace();
  const query = await searchParams;
  const stage = parsePartnerQueueStage(query.stage);
  const stageMeta = PARTNER_QUEUE_STAGES.find((item) => item.stage === stage)!;

  const rows = await listFulfillmentJobs({
    ventureId: session.ventureId,
    path: "sweetoh",
    statuses: statusesForPartnerStage(stage),
  });

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs" style={{ color: "var(--so-cream-dim)" }}>
          <Link href="/partner/studio" className="hover:underline" style={{ color: "var(--so-cream)" }}>
            Studio
          </Link>
          {" / "}
          Ship
        </p>
        <h1 className="mt-2 text-xl font-semibold" style={{ color: "var(--so-cream)" }}>
          Ship
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--so-cream-dim)" }}>
          Orders out the door. Update status and tracking on each job.
        </p>
        <p className="mt-2 text-sm" style={{ color: "var(--so-cream-dim)" }}>
          Viewing: <span style={{ color: "var(--so-cream)" }}>{stageMeta.label}</span>
        </p>
      </div>

      <div className="flex flex-wrap gap-2 text-sm">
        {PARTNER_QUEUE_STAGES.map((tab) => {
          const isActive = tab.stage === stage;

          return (
            <Link
              key={tab.stage}
              href={tab.href}
              className="rounded-full px-3 py-1.5 transition-colors"
              style={
                isActive
                  ? {
                      background: "var(--so-gold)",
                      color: "var(--so-black)",
                    }
                  : {
                      border: "1px solid var(--so-border)",
                      color: "var(--so-cream-dim)",
                    }
              }
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      <section
        className="rounded-xl border"
        style={{ borderColor: "var(--so-border)", background: "var(--so-dark)" }}
      >
        {rows.length === 0 ? (
          <p className="px-6 py-8 text-sm" style={{ color: "var(--so-cream-dim)" }}>
            No orders in this stage.
          </p>
        ) : (
          <ul className="divide-y" style={{ borderColor: "var(--so-border)" }}>
            {rows.map(({ job, lineItem, order }) => (
              <li key={job.id} className="px-6 py-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Link
                    href={`/partner/queue/${job.id}`}
                    className="font-medium hover:underline"
                    style={{ color: "var(--so-gold)" }}
                  >
                    {lineItem.productName} × {lineItem.quantity}
                  </Link>
                  <span className="text-sm" style={{ color: "var(--so-cream-dim)" }}>
                    {job.status}
                  </span>
                </div>
                <p className="mt-1 text-sm" style={{ color: "var(--so-cream-dim)" }}>
                  {order.customerEmail} ·{" "}
                  {new Date(order.createdAt).toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
