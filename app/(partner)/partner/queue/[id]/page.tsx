import Link from "next/link";
import { notFound } from "next/navigation";
import { getFulfillmentJobById } from "@/lib/domains/fulfillment/service";
import { requireRole } from "@/lib/domains/identity/service";
import { ForbiddenError, NotFoundError } from "@/lib/shared/errors";
import { FlashBanner } from "@/app/(owner)/owner/components/flash-banner";
import { updatePartnerFulfillmentJobStatusAction } from "../../actions/fulfillment";

type PartnerQueueJobPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; success?: string }>;
};

const STATUSES = [
  "new",
  "in_production",
  "ready_to_ship",
  "shipped",
  "delivered",
  "cancelled",
];

export default async function PartnerQueueJobPage({
  params,
  searchParams,
}: PartnerQueueJobPageProps) {
  const session = await requireRole("partner");
  const { id } = await params;
  const query = await searchParams;

  let result;
  try {
    result = await getFulfillmentJobById({ ventureId: session.ventureId, jobId: id });

    if (result.job.path !== "sweetoh") {
      throw new ForbiddenError();
    }
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof ForbiddenError) {
      notFound();
    }
    throw error;
  }

  const { job, lineItem, order, events } = result;

  async function updateStatus(formData: FormData) {
    "use server";
    await updatePartnerFulfillmentJobStatusAction(id, formData);
  }

  return (
    <div className="space-y-6">
      <FlashBanner message={query.error} variant="error" />
      <FlashBanner message={query.success} variant="success" />

      <div>
        <Link href="/partner/queue" className="text-sm text-emerald-800 hover:underline">
          ← Queue
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">
          {lineItem.productName} × {lineItem.quantity}
        </h1>
        <p className="mt-1 text-sm text-neutral-600">
          Sweet&apos;Oh · {order.customerEmail}
        </p>
      </div>

      <section className="rounded-lg border border-neutral-200 bg-white p-6">
        <h2 className="text-lg font-medium">Update status</h2>
        <form action={updateStatus} className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block text-neutral-700">Status</span>
            <select
              name="status"
              required
              defaultValue={job.status}
              className="w-full rounded border border-neutral-300 px-3 py-2"
            >
              {STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-neutral-700">Tracking number</span>
            <input
              name="trackingNumber"
              defaultValue={job.trackingNumber ?? ""}
              className="w-full rounded border border-neutral-300 px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-neutral-700">Tracking URL</span>
            <input
              name="trackingUrl"
              defaultValue={job.trackingUrl ?? ""}
              className="w-full rounded border border-neutral-300 px-3 py-2"
            />
          </label>
          <label className="block text-sm md:col-span-2">
            <span className="mb-1 block text-neutral-700">Notes</span>
            <textarea
              name="notes"
              rows={3}
              defaultValue={job.notes ?? ""}
              className="w-full rounded border border-neutral-300 px-3 py-2"
            />
          </label>
          <div className="md:col-span-2">
            <button
              type="submit"
              className="rounded bg-emerald-800 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-900"
            >
              Save
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-lg border border-neutral-200 bg-white">
        <div className="border-b border-neutral-200 px-6 py-4">
          <h2 className="text-lg font-medium">History</h2>
        </div>
        {events.length === 0 ? (
          <p className="px-6 py-8 text-sm text-neutral-500">No history yet.</p>
        ) : (
          <ul className="divide-y divide-neutral-200">
            {events.map((event) => (
              <li key={event.id} className="px-6 py-4">
                <p className="text-sm font-medium">
                  {event.status.replaceAll("_", " ")}
                </p>
                <p className="text-xs text-neutral-500">
                  {new Date(event.createdAt).toLocaleString()}
                </p>
                {event.note ? (
                  <p className="mt-1 text-sm text-neutral-600">{event.note}</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
