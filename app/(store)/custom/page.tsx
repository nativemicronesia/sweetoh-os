import Link from "next/link";
import type { Metadata } from "next";
import { getCurrentCustomer } from "@/lib/domains/customers/account";
import {
  CUSTOM_PRODUCT_TYPES,
  CUSTOM_REQUEST_MAX_PHOTOS,
  listCustomerRequests,
  STATUS_LABEL,
  type CustomRequestStatus,
} from "@/lib/domains/customers/custom-requests";
import { customerSignOutAction } from "../account/actions";
import { Reveal } from "../components/reveal";
import { CustomRequestForm } from "./custom-request-form";

export const metadata: Metadata = {
  title: "Bring us an idea",
  description: "Something made just for you: your design, names, a logo, or a batch for your team, family or event. Send the shop a request.",
};

const BRING = [
  { n: "01", title: "A photo", body: "Someone you love, a place, a pet, a moment." },
  { n: "02", title: "A few words", body: "A name, a date, a saying, an inside joke." },
  { n: "03", title: "An occasion", body: "A reunion, a birthday, a team, a send-off." },
  { n: "04", title: "A reference", body: "Something you saw and wish existed in your size." },
];

export default async function CustomPage({ searchParams }: { searchParams: Promise<{ sent?: string; welcome?: string; product?: string; from?: string }> }) {
  const [shopper, query] = await Promise.all([getCurrentCustomer(), searchParams]);
  const requests = shopper ? await listCustomerRequests(shopper) : [];
  const personalize = query.from === "personalize" || Boolean(query.product);

  return (
    <div className="sx-paper">
      <section className="sx-wrap sx-pagehead">
        <p className="sx-label sx-mono so-animate-in">{personalize ? "Make it yours" : "Bring us an idea"}</p>
        <h1 className="sx-h1 so-animate-in-delay" style={{ marginTop: "1rem", maxWidth: "13ch" }}>
          {personalize ? <>Make it <span className="sx-em">yours.</span></> : <>Start with <span className="sx-em">anything.</span></>}
        </h1>
        <p className="sx-lede so-animate-in-delay-2" style={{ marginTop: "1.3rem" }}>
          {personalize
            ? "Names, dates, faces, colors. Tell us how it should change and we'll design it for you."
            : "You don't need a finished design. Bring a photo, a few words, an occasion, and we'll turn it into something real."}
          {" "}We review every request and email you back. Nothing is made or charged until you say yes.
        </p>
        <div className="sx-grid2 sx-bring" style={{ marginTop: "2rem", gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}>
          {BRING.map((b, i) => (
            <Reveal key={b.n} delay={i * 60}>
              <div className="sx-bring-item">
                <span className="sx-mono" style={{ color: "var(--sx-vermilion-deep)" }}>{b.n}</span>
                <b>{b.title}</b>
                <span>{b.body}</span>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="sx-wrap" style={{ maxWidth: "52rem", paddingBottom: "clamp(3rem, 7vw, 6rem)" }}>
        {!shopper ? (
          <div className="sx-card" style={{ padding: "clamp(1.4rem, 4vw, 2.4rem)", background: "var(--so-ink)", color: "#f4ecdd" }}>
            <p className="sx-mono" style={{ color: "#f0c419" }}>First, so we can reach you</p>
            <h2 className="sx-h2" style={{ marginTop: "0.7rem", color: "#f4ecdd", maxWidth: "16ch" }}>Make a free account to send your idea.</h2>
            <p style={{ marginTop: "0.9rem", color: "#cfc4ad", maxWidth: "44ch" }}>It takes a minute. We email you when we reply, and you can follow every request here.</p>
            <div style={{ marginTop: "1.5rem", display: "flex", flexWrap: "wrap", gap: "0.9rem" }}>
              <Link href="/account?next=/custom" className="so-btn-primary" style={{ background: "#f4ecdd", color: "#16120d", borderColor: "#f4ecdd" }}>Create account</Link>
              <Link href="/account?mode=login&next=/custom" className="so-btn-ghost" style={{ color: "#f4ecdd", borderColor: "#f4ecdd" }}>Sign in</Link>
            </div>
          </div>
        ) : (
          <>
            {query.sent && (
              <p className="sx-card" style={{ padding: "1rem 1.2rem", marginBottom: "1.5rem", background: "var(--sx-yellow)" }}>
                Sent! We&apos;ll email you at <strong>{shopper.email}</strong>. Ask Skink (bottom corner) for an update anytime.
              </p>
            )}
            {query.welcome && !query.sent && (
              <p style={{ marginBottom: "1.2rem", fontWeight: 600 }}>Welcome, {shopper.name?.split(" ")[0] ?? "friend"}. Tell us what you&apos;re picturing.</p>
            )}
            <CustomRequestForm productTypes={[...CUSTOM_PRODUCT_TYPES]} maxPhotos={CUSTOM_REQUEST_MAX_PHOTOS} defaultPhone={shopper.phone ?? ""} defaultType={query.product ?? ""} />

            {requests.length > 0 && (
              <div style={{ marginTop: "3.5rem" }}>
                <h2 className="sx-h3">Your requests</h2>
                <ul style={{ marginTop: "1rem", listStyle: "none", padding: 0 }}>
                  {requests.map((r) => (
                    <li key={r.id} style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: "0.5rem", padding: "0.8rem 0", borderTop: "1.5px solid var(--sx-line)" }}>
                      <span>
                        {r.productType}{r.quantity > 1 ? ` × ${r.quantity}` : ""} <span className="so-muted">· {r.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                      </span>
                      <span className="sx-mono" style={{ color: "var(--so-gold)" }}>{STATUS_LABEL[r.status as CustomRequestStatus] ?? r.status}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <form action={customerSignOutAction} style={{ marginTop: "2.5rem", fontSize: "0.9rem" }} className="so-muted">
              Signed in as {shopper.email} ·{" "}
              <button type="submit" className="so-link">Sign out</button>
            </form>
          </>
        )}
      </section>
    </div>
  );
}
