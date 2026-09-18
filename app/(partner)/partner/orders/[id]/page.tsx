import { getProductById, getPrimaryProductImageUrl } from "@/lib/domains/catalog/service";
import { getAssetById, getAssetSignedUrl } from "@/lib/domains/assets/service";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FlashBanner } from "@/app/(owner)/owner/components/flash-banner";
import { getFulfillmentJobById } from "@/lib/domains/fulfillment/service";
import { PARTNER_JOB_STATUSES } from "@/lib/domains/fulfillment/partner-jobs";
import { requirePartnerWorkspace } from "@/lib/domains/identity/service";
import { formatPrice } from "@/lib/shared/format";
import { ForbiddenError, NotFoundError } from "@/lib/shared/errors";
import { updatePartnerFulfillmentJobStatusAction } from "../../actions/fulfillment";

type PartnerOrderJobPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; success?: string }>;
};

export default async function PartnerOrderJobPage({
  params,
  searchParams,
}: PartnerOrderJobPageProps) {
  const session = await requirePartnerWorkspace();
  const { id } = await params;
  const query = await searchParams;

  let result;
  try {
    result = await getFulfillmentJobById({
      ventureId: session.ventureId,
      jobId: id,
    });

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

  const product = await getProductById({ ventureId: session.ventureId, productId: lineItem.productId });
  const [photo, source] = await Promise.all([getPrimaryProductImageUrl(product.id), product.sourceAssetId ? getAssetById({ ventureId: session.ventureId, assetId: product.sourceAssetId }) : null]);
  const sourceUrl = source ? await getAssetSignedUrl({ ventureId: session.ventureId, assetId: source.id }) : null;

  async function updateStatus(formData: FormData) {
    "use server";
    await updatePartnerFulfillmentJobStatusAction(id, formData);
  }

  return (
    <div className="space-y-6">
      <FlashBanner message={query.error} variant="error" />
      <FlashBanner message={query.success} variant="success" />

      <div>
        <Link
          href="/partner/orders?tab=catalog"
          className="text-sm underline"
          style={{ color: "var(--so-cream-dim)" }}
        >
          ← Orders
        </Link>
        <h1
          className="mt-2 text-xl font-semibold"
          style={{ color: "var(--so-cream)" }}
        >
          {lineItem.productName} × {lineItem.quantity}
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--so-cream-dim)" }}>
          {order.customerEmail} · {formatPrice(lineItem.priceCentsAtPurchase)}{" "}
          each ·{" "}
          {new Date(order.createdAt).toLocaleString()}
        </p>
      </div>

      <section className="flex flex-wrap items-center gap-5 rounded-xl border bg-white p-6" style={{borderColor:"var(--so-border)"}}>
        {photo && <img src={photo} alt={product.name} className="h-28 w-28 rounded-lg object-contain"/>}
        <div className="space-y-2"><h2 className="font-semibold">Local production · {lineItem.quantity} {lineItem.quantity === 1 ? "item" : "items"}</h2>
          <p className="text-sm so-muted">{product.name}</p>
          {source?.compositionLayout ? <Link className="studio-primary" href={`/partner/canvas?composition=${source.id}`}>Open design & download print files</Link> : sourceUrl ? <a href={sourceUrl} target="_blank" rel="noreferrer" className="so-link">Open source artwork ↗</a> : <p className="text-sm so-muted">No artwork attached to this product.</p>}
        </div>
      </section>
      <section
        className="rounded-xl border p-6"
        style={{ borderColor: "var(--so-border)", background: "var(--so-dark)" }}
      >
        <h2 className="text-lg font-medium" style={{ color: "var(--so-cream)" }}>
          Update status
        </h2>
        <form action={updateStatus} className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block" style={{ color: "var(--so-cream)" }}>
              Status
            </span>
            <select
              name="status"
              required
              defaultValue={job.status}
              className="w-full rounded-lg border px-3 py-2"
              style={{
                borderColor: "var(--so-border)",
                background: "var(--so-black)",
                color: "var(--so-cream)",
              }}
            >
              {PARTNER_JOB_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block" style={{ color: "var(--so-cream)" }}>
              Tracking number
            </span>
            <input
              name="trackingNumber"
              defaultValue={job.trackingNumber ?? ""}
              className="w-full rounded-lg border px-3 py-2"
              style={{
                borderColor: "var(--so-border)",
                background: "var(--so-black)",
                color: "var(--so-cream)",
              }}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block" style={{ color: "var(--so-cream)" }}>
              Tracking URL
            </span>
            <input
              name="trackingUrl"
              defaultValue={job.trackingUrl ?? ""}
              className="w-full rounded-lg border px-3 py-2"
              style={{
                borderColor: "var(--so-border)",
                background: "var(--so-black)",
                color: "var(--so-cream)",
              }}
            />
          </label>
          <label className="block text-sm md:col-span-2">
            <span className="mb-1 block" style={{ color: "var(--so-cream)" }}>
              Notes
            </span>
            <textarea
              name="notes"
              rows={3}
              defaultValue={job.notes ?? ""}
              className="w-full rounded-lg border px-3 py-2"
              style={{
                borderColor: "var(--so-border)",
                background: "var(--so-black)",
                color: "var(--so-cream)",
              }}
            />
          </label>
          <div className="md:col-span-2">
            <button
              type="submit"
              className="rounded-full px-5 py-2.5 text-sm font-medium"
              style={{ background: "var(--so-gold)", color: "var(--so-ink)" }}
            >
              Save
            </button>
          </div>
        </form>
      </section>

      <section
        className="rounded-xl border"
        style={{ borderColor: "var(--so-border)", background: "var(--so-dark)" }}
      >
        <div
          className="border-b px-6 py-4"
          style={{ borderColor: "var(--so-border)" }}
        >
          <h2 className="text-lg font-medium" style={{ color: "var(--so-cream)" }}>
            History
          </h2>
        </div>
        {events.length === 0 ? (
          <p className="px-6 py-8 text-sm" style={{ color: "var(--so-cream-dim)" }}>
            No history yet.
          </p>
        ) : (
          <ul className="divide-y" style={{ borderColor: "var(--so-border)" }}>
            {events.map((event) => (
              <li key={event.id} className="px-6 py-4">
                <p className="text-sm font-medium" style={{ color: "var(--so-cream)" }}>
                  {event.status.replaceAll("_", " ")}
                </p>
                <p className="text-xs" style={{ color: "var(--so-cream-dim)" }}>
                  {new Date(event.createdAt).toLocaleString()}
                </p>
                {event.note ? (
                  <p className="mt-1 text-sm" style={{ color: "var(--so-cream-dim)" }}>
                    {event.note}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
