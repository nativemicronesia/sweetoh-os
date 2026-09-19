import Link from "next/link";
import { Printer } from "lucide-react";
import { requireCreator } from "@/lib/domains/identity/service";
import { getCreditBalance } from "@/lib/domains/creator/credits";
import { isAcceptingRequests, listCreatorRequests, requestFileUrls, REQUEST_STATUS_LABEL } from "@/lib/domains/creator/print-requests";
import { formatUsd } from "@/lib/domains/creator/plans";
import { cancelPrintRequestAction, payPrintRequestAction } from "../actions/billing";
import { SubmitButton } from "../components/submit-button";

export const metadata = { title: "Print with Sweet'Oh" };

const BADGE: Record<string, string> = { new: "cs-badge-gold", quoted: "cs-badge-coral", paid: "cs-badge-green", in_production: "cs-badge-green", shipped: "cs-badge-green" };

export default async function RequestsPage({ searchParams }: { searchParams: Promise<{ paid?: string; error?: string }> }) {
  const session = await requireCreator();
  const [query, requests, accepting, { plan }] = await Promise.all([searchParams, listCreatorRequests(session.appUser.id), isAcceptingRequests().catch(() => false), getCreditBalance(session.appUser.id)]);
  const withFiles = await Promise.all(requests.map(async (r) => ({ r, files: await requestFileUrls(r) })));
  return (
    <div className="cs-stack" style={{ gap: 24 }}>
      <header>
        <div className="cs-eyebrow">Print with Sweet&apos;Oh</div>
        <h1 className="cs-h1">Let the Sweet&apos;Oh shop print it</h1>
        <p className="cs-sub">For events, family reunions, church and school groups, or your first inventory. Send a request from the Studio (<strong>Sell it → Print with Sweet&apos;Oh</strong>); the shop in Lacey, WA reviews it and sends a quote. You only pay if you accept.</p>
        <p className="cs-muted" style={{ fontSize: 14, marginTop: 8 }}>
          {plan.id === "free" ? "Included with Creator and Pro." : accepting ? "✅ Sweet'Oh is taking requests right now." : "⏸ Sweet'Oh is at capacity right now — requests are paused."}
        </p>
      </header>
      {query.paid && <p className="cs-note" role="status">Payment received — your order is in the Sweet&apos;Oh print queue.</p>}
      {query.error && <p className="cs-alert" role="alert">{query.error}</p>}

      {requests.length === 0 ? (
        <div className="cs-empty">
          <Printer size={34} color="var(--cs-green)" />
          <h3>No print requests yet</h3>
          <p className="cs-muted" style={{ margin: "0 auto 16px", maxWidth: 440 }}>Open one of your designs and choose Sell it → Print with Sweet&apos;Oh.</p>
          <Link href="/studio/designs" className="cs-btn cs-btn-primary">My designs</Link>
        </div>
      ) : (
        <div className="cs-card">
          <div className="cs-list">
            {withFiles.map(({ r, files }) => (
              <div key={r.id} style={{ display: "grid", gridTemplateColumns: "72px 1fr auto", gap: 16, alignItems: "center" }}>
                <div style={{ width: 72, height: 72, borderRadius: 12, overflow: "hidden", background: "#f4f5f7" }}>{files.mockup && <img src={files.mockup} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}</div>
                <div style={{ minWidth: 0 }}>
                  <strong>{r.productName}</strong>
                  <div className="cs-muted" style={{ fontSize: 13 }}>
                    {r.quantity} {r.quantity === 1 ? "piece" : "pieces"} · sent {r.createdAt.toLocaleDateString()}
                  </div>
                  {r.partnerNote && <p style={{ margin: "6px 0 0", fontSize: 14 }}>“{r.partnerNote}” — Sweet&apos;Oh</p>}
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
                  <span className={`cs-badge ${BADGE[r.status] ?? ""}`}>{REQUEST_STATUS_LABEL[r.status] ?? r.status}</span>
                  {r.status === "quoted" && r.quoteCents && (
                    <form action={payPrintRequestAction}>
                      <input type="hidden" name="id" value={r.id} />
                      <SubmitButton className="cs-btn cs-btn-primary cs-btn-sm">Pay {formatUsd(r.quoteCents)}</SubmitButton>
                    </form>
                  )}
                  {(r.status === "new" || r.status === "quoted") && (
                    <form action={cancelPrintRequestAction}>
                      <input type="hidden" name="id" value={r.id} />
                      <button className="cs-btn cs-btn-quiet cs-btn-sm">Cancel</button>
                    </form>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
