import { Download, Sparkles } from "lucide-react";
import { requirePartnerWorkspace } from "@/lib/domains/identity/service";
import { isAcceptingRequests, listShopRequests, requestFileUrls, REQUEST_STATUS_LABEL } from "@/lib/domains/creator/print-requests";
import { FlashBanner } from "@/app/(owner)/owner/components/flash-banner";
import { advanceRequestAction, declineRequestAction, quoteRequestAction, setAcceptingAction } from "../actions/creator-requests";
import { SubmitButton } from "../components/submit-button";

export const metadata = { title: "Creator requests" };

const PARTNER_LABEL: Record<string, string> = { ...REQUEST_STATUS_LABEL, new: "New — needs a quote", quoted: "Quote sent — waiting on creator", paid: "Paid — ready to print" };

export default async function CreatorRequestsPage({ searchParams }: { searchParams: Promise<{ success?: string; error?: string; show?: string }> }) {
  const session = await requirePartnerWorkspace();
  const [query, rows, accepting] = await Promise.all([searchParams, listShopRequests(session.ventureId), isAcceptingRequests()]);
  const open = rows.filter((r) => ["new", "quoted", "paid", "in_production"].includes(r.request.status));
  const closed = rows.filter((r) => !open.includes(r));
  const list = query.show === "all" ? rows : open;
  const withFiles = await Promise.all(list.map(async (row) => ({ ...row, files: await requestFileUrls(row.request) })));

  return (
    <div className="space-y-6">
      <header className="studio-page-heading">
        <div>
          <p className="studio-kicker"><Sparkles size={12} style={{ display: "inline", verticalAlign: -1 }} /> From Sweet&apos;Oh AI creators</p>
          <h1>Creator requests</h1>
          <p>Print jobs requested by creators using Create with Sweet&apos;Oh — separate from your shop&apos;s own orders. You choose what to take on.</p>
        </div>
      </header>
      <FlashBanner message={query.success} variant="success" />
      <FlashBanner message={query.error} variant="error" />

      <form action={setAcceptingAction} className="rounded-xl border bg-white p-4 flex flex-wrap items-center justify-between gap-3" style={{ borderColor: "var(--so-border)" }}>
        <div>
          <strong>{accepting ? "Taking creator requests" : "Creator requests paused"}</strong>
          <p className="text-sm" style={{ color: "var(--so-cream-dim)" }}>{accepting ? "Creators can send you print requests from their Studio." : "Creators see that Sweet'Oh is at capacity and are pointed to Printify."}</p>
        </div>
        <input type="hidden" name="accepting" value={accepting ? "off" : "on"} />
        <SubmitButton pendingLabel="Saving…">{accepting ? "Pause requests" : "Start taking requests"}</SubmitButton>
      </form>

      <div className="flex gap-3 text-sm">
        <a href="/partner/creator-requests" className={query.show === "all" ? "underline" : "font-semibold"}>Open ({open.length})</a>
        <a href="/partner/creator-requests?show=all" className={query.show === "all" ? "font-semibold" : "underline"}>All ({rows.length})</a>
        {closed.length > 0 && query.show !== "all" && <span style={{ color: "var(--so-cream-dim)" }}>{closed.length} closed</span>}
      </div>

      {withFiles.length === 0 ? (
        <div className="rounded-xl border bg-white p-10 text-center" style={{ borderColor: "var(--so-border)" }}>
          <p><strong>No creator requests right now.</strong></p>
          <p className="text-sm mt-1" style={{ color: "var(--so-cream-dim)" }}>When a creator asks Sweet&apos;Oh to print their design, it shows up here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {withFiles.map(({ request: r, creatorName, creatorEmail, files }) => (
            <article key={r.id} className="rounded-xl border bg-white p-5" style={{ borderColor: "var(--so-border)" }}>
              <div className="flex flex-wrap gap-5">
                <div style={{ width: 150, height: 150, borderRadius: 12, overflow: "hidden", background: "#f4f5f7", flex: "none" }}>
                  {files.mockup && <img src={files.mockup} alt={r.productName} style={{ width: "100%", height: "100%", objectFit: "contain" }} />}
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="text-lg font-semibold">{r.productName}</h2>
                    <span className="rounded-full px-3 py-1 text-xs font-semibold" style={{ background: r.status === "new" || r.status === "paid" ? "#fbefd6" : "#eef3ef" }}>{PARTNER_LABEL[r.status] ?? r.status}</span>
                  </div>
                  <p className="text-sm" style={{ color: "var(--so-cream-dim)" }}>
                    From <strong>{creatorName ?? creatorEmail}</strong> · {creatorEmail} · {r.createdAt.toLocaleString()}
                    {r.items?.productLabel ? ` · ${r.items.productLabel}` : ""}
                  </p>
                  <p className="text-sm">
                    <strong>{r.quantity} pieces:</strong>{" "}
                    {(r.items?.lines ?? []).map((l) => `${l.quantity}× ${[l.color, l.size].filter(Boolean).join(" ") || "item"}`).join(", ")}
                  </p>
                  {r.creatorNote && <p className="text-sm">Note: “{r.creatorNote}”</p>}
                  {r.shipTo && <p className="text-sm whitespace-pre-line"><strong>Ship to:</strong> {r.shipTo}</p>}
                  <div className="flex flex-wrap gap-2 pt-1">
                    {files.files.map((f) =>
                      f.url ? (
                        <a key={f.assetId} href={f.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm" style={{ borderColor: "var(--so-border)" }}>
                          <Download size={14} /> {f.surface} print file ({f.width}×{f.height})
                        </a>
                      ) : null,
                    )}
                  </div>
                  {r.quoteCents && <p className="text-sm">Quote: <strong>${(r.quoteCents / 100).toFixed(2)}</strong>{r.partnerNote ? ` — “${r.partnerNote}”` : ""}</p>}

                  {(r.status === "new" || r.status === "quoted") && (
                    <div className="flex flex-wrap gap-3 pt-2">
                      <form action={quoteRequestAction} className="flex flex-wrap items-end gap-2">
                        <input type="hidden" name="id" value={r.id} />
                        <label className="text-sm">Total price (USD)<br />
                          <input name="quote" inputMode="decimal" required defaultValue={r.quoteCents ? (r.quoteCents / 100).toFixed(2) : ""} className="rounded-lg border px-3 py-2" style={{ borderColor: "var(--so-border)", width: 120 }} />
                        </label>
                        <label className="text-sm">Note (optional)<br />
                          <input name="note" defaultValue={r.partnerNote ?? ""} placeholder="Ready in 7 days, includes shipping…" className="rounded-lg border px-3 py-2" style={{ borderColor: "var(--so-border)", width: 260 }} />
                        </label>
                        <SubmitButton pendingLabel="Sending…">{r.status === "quoted" ? "Update quote" : "Accept & send quote"}</SubmitButton>
                      </form>
                      <form action={declineRequestAction} className="flex items-end">
                        <input type="hidden" name="id" value={r.id} />
                        <button className="rounded-lg border px-3 py-2 text-sm" style={{ borderColor: "var(--so-border)" }}>Decline</button>
                      </form>
                    </div>
                  )}
                  {r.status === "paid" && (
                    <form action={advanceRequestAction}><input type="hidden" name="id" value={r.id} /><input type="hidden" name="status" value="in_production" /><SubmitButton pendingLabel="Saving…">Start printing</SubmitButton></form>
                  )}
                  {r.status === "in_production" && (
                    <form action={advanceRequestAction}><input type="hidden" name="id" value={r.id} /><input type="hidden" name="status" value="shipped" /><SubmitButton pendingLabel="Saving…">Mark shipped</SubmitButton></form>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
