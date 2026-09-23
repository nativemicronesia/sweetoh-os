import { Mail, MessageSquareText, Phone } from "lucide-react";
import { requirePartnerWorkspace } from "@/lib/domains/identity/service";
import { CUSTOM_REQUEST_STATUSES, listInboxRequests, STATUS_LABEL, type CustomRequestStatus } from "@/lib/domains/customers/custom-requests";
import { updateCustomRequestAction } from "../actions/custom-requests";
import { SubmitButton } from "../components/submit-button";

export const metadata = { title: "Custom requests" };

const STATUS_HELP: Record<CustomRequestStatus, string> = {
  new: "New — reply to them",
  contacted: "You emailed them",
  quoted: "Price sent — waiting on them",
  done: "Done",
  declined: "Declined",
};

function mailto(email: string, name: string | null, productType: string) {
  const first = name?.split(" ")[0];
  const subject = `Your Sweet'Oh custom request — ${productType}`;
  const body = `${first ? `Hi ${first},` : "Hi,"}\n\nThanks for your custom request! `;
  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export default async function CustomRequestsPage({ searchParams }: { searchParams: Promise<{ show?: string }> }) {
  const session = await requirePartnerWorkspace();
  const { show } = await searchParams;
  const all = show === "all";
  const rows = await listInboxRequests(session, all ? "all" : "open");

  return (
    <div className="space-y-6">
      <header className="studio-page-heading">
        <div>
          <p className="studio-kicker"><MessageSquareText size={12} style={{ display: "inline", verticalAlign: -1 }} /> From your shop&apos;s customers</p>
          <h1>Custom requests</h1>
          <p>Customers who signed up and asked for something custom. Reply from your own email, then move each one along so nothing gets lost.</p>
        </div>
      </header>

      <div className="flex gap-3 text-sm">
        <a href="/partner/custom-requests" className={all ? "underline" : "font-semibold"}>Open</a>
        <a href="/partner/custom-requests?show=all" className={all ? "font-semibold" : "underline"}>All</a>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border bg-white p-10 text-center" style={{ borderColor: "var(--pf-border)" }}>
          <p><strong>No {all ? "" : "open "}custom requests.</strong></p>
          <p className="text-sm mt-1" style={{ color: "var(--pf-muted)" }}>When a customer sends one from the shop&apos;s Custom orders page, it shows up here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {rows.map((r) => (
            <article key={r.id} id={r.id} className="rounded-xl border bg-white p-5" style={{ borderColor: r.status === "new" ? "var(--pf-primary)" : "var(--pf-border)" }}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p style={{ fontWeight: 600, fontSize: 17 }}>
                    {r.productType}{r.quantity > 1 ? ` × ${r.quantity}` : ""}
                  </p>
                  <p className="text-sm" style={{ color: "var(--pf-muted)" }}>
                    {r.customerName ?? "Customer"} · {r.customerEmail} · {r.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </p>
                </div>
                <span className="rounded-full px-3 py-1 text-xs font-semibold" style={{ background: r.status === "new" ? "var(--pf-primary)" : "#eef0f2", color: r.status === "new" ? "white" : "inherit" }}>
                  {STATUS_HELP[r.status as CustomRequestStatus] ?? r.status}
                </span>
              </div>

              <p className="mt-3 whitespace-pre-line text-sm">{r.description}</p>
              <p className="mt-2 text-sm" style={{ color: "var(--pf-muted)" }}>
                {[r.neededBy && `Needed by ${new Date(`${r.neededBy}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`, r.budget && `Budget: ${r.budget}`].filter(Boolean).join(" · ")}
              </p>

              {r.photoUrls.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {r.photoUrls.map((url, i) => (
                    <a key={url} href={url} target="_blank" rel="noopener noreferrer">
                      <img src={url} alt={`Customer photo ${i + 1}`} style={{ width: 110, height: 110, objectFit: "cover", borderRadius: 10, border: "1px solid var(--pf-border)" }} />
                    </a>
                  ))}
                </div>
              )}

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <a className="pe-btn pe-btn-primary" href={mailto(r.customerEmail, r.customerName, r.productType)}>
                  <Mail size={15} /> Reply by email
                </a>
                {r.phone && (
                  <a className="pe-btn pe-btn-ghost" href={`tel:${r.phone.replace(/[^\d+]/g, "")}`}>
                    <Phone size={15} /> {r.phone}
                  </a>
                )}
              </div>

              <form action={updateCustomRequestAction} className="mt-4 grid gap-3 sm:grid-cols-[180px_1fr_auto] sm:items-end">
                <input type="hidden" name="id" value={r.id} />
                <label className="text-sm">
                  Status
                  <select name="status" defaultValue={r.status} className="mt-1 w-full rounded-lg border p-2" style={{ borderColor: "var(--pf-border)" }}>
                    {CUSTOM_REQUEST_STATUSES.map((s) => (
                      <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                    ))}
                  </select>
                </label>
                <label className="text-sm">
                  Your notes (only you see these)
                  <input name="partnerNotes" defaultValue={r.partnerNotes ?? ""} maxLength={4000} placeholder="e.g. quoted $18/shirt, 2 weeks" className="mt-1 w-full rounded-lg border p-2" style={{ borderColor: "var(--pf-border)" }} />
                </label>
                <SubmitButton pendingLabel="Saving…">Save</SubmitButton>
              </form>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
