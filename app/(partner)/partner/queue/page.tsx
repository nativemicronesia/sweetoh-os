import Link from "next/link";
import {
  listFulfillmentJobs,
  statusesForPartnerStage,
} from "@/lib/domains/fulfillment";
import {
  PARTNER_QUEUE_STAGES,
  parsePartnerQueueStage,
} from "@/lib/domains/fulfillment/scopes";
import { requireRole } from "@/lib/domains/identity/service";

type PartnerQueuePageProps = {
  searchParams: Promise<{ stage?: string }>;
};

export default async function PartnerQueuePage({
  searchParams,
}: PartnerQueuePageProps) {
  const session = await requireRole("partner");
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
        <h1 className="text-2xl font-semibold">{stageMeta.label}</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Sweet&apos;Oh fulfillment jobs only. Update status and tracking on the job
          detail page.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 text-sm">
        {PARTNER_QUEUE_STAGES.map((tab) => {
          const isActive = tab.stage === stage;

          return (
            <Link
              key={tab.stage}
              href={tab.href}
              className={`rounded border px-3 py-1.5 ${
                isActive
                  ? "border-emerald-800 bg-emerald-800 text-white"
                  : "border-neutral-300 text-neutral-700 hover:bg-neutral-50"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      <section className="rounded-lg border border-neutral-200 bg-white">
        {rows.length === 0 ? (
          <p className="px-6 py-8 text-sm text-neutral-500">
            No jobs in this stage.
          </p>
        ) : (
          <ul className="divide-y divide-neutral-200">
            {rows.map(({ job, lineItem, order }) => (
              <li key={job.id} className="px-6 py-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Link
                    href={`/partner/queue/${job.id}`}
                    className="font-medium text-emerald-800 hover:underline"
                  >
                    {lineItem.productName} × {lineItem.quantity}
                  </Link>
                  <span className="text-sm text-neutral-500">{job.status}</span>
                </div>
                <p className="mt-1 text-sm text-neutral-500">
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
