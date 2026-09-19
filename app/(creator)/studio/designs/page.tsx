import Link from "next/link";
import { CheckCircle2, Palette, Plus } from "lucide-react";
import { requireCreator } from "@/lib/domains/identity/service";
import { listPartnerLibraryDesigns } from "@/lib/domains/catalog/partner-design-library";
import { getCreditBalance } from "@/lib/domains/creator/credits";
import { DeleteDesignButton } from "./delete-design";

export const metadata = { title: "My designs" };

export default async function DesignsPage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const session = await requireCreator();
  const [query, designs, { plan }] = await Promise.all([searchParams, listPartnerLibraryDesigns(session.ventureId), getCreditBalance(session.appUser.id)]);
  const saved = designs.filter((d) => d.isComposition);
  const artwork = designs.filter((d) => !d.isComposition && !/^(print-file|mockup):/.test(d.notes ?? ""));
  return (
    <div className="cs-stack" style={{ gap: 24 }}>
      <header className="cs-between" style={{ alignItems: "end" }}>
        <div>
          <div className="cs-eyebrow">Your work</div>
          <h1 className="cs-h1">My designs</h1>
          <p className="cs-sub">
            Open a design to keep editing, send it to your Printify store, or ask Sweet&apos;Oh to print it.
            {plan.savedDesigns !== null && ` ${saved.length} of ${plan.savedDesigns} saved on the ${plan.name} plan.`}
          </p>
        </div>
        <Link href="/studio/catalog" className="cs-btn cs-btn-primary"><Plus size={16} /> New design</Link>
      </header>

      {query.saved && (
        <p className="cs-note" role="status"><CheckCircle2 size={16} style={{ verticalAlign: -3 }} /> Saved! Open it any time to keep editing — or choose <strong>Sell it</strong> in the Studio when you&apos;re ready.</p>
      )}

      {saved.length === 0 ? (
        <div className="cs-empty">
          <Palette size={34} color="var(--cs-green)" />
          <h3>No designs yet</h3>
          <p className="cs-muted" style={{ margin: "0 auto 16px", maxWidth: 420 }}>Pick a product from the catalog and make your first design. Skink can help with ideas.</p>
          <div className="cs-row" style={{ justifyContent: "center" }}>
            <Link href="/studio/catalog" className="cs-btn cs-btn-primary">Browse the catalog</Link>
            <Link href="/studio/skink" className="cs-btn cs-btn-ghost">Get ideas from Skink</Link>
          </div>
        </div>
      ) : (
        <div className="cs-designs">
          {saved.map((d) => (
            <article key={d.id} className="cs-design" style={query.saved === d.id ? { borderColor: "var(--cs-green)", boxShadow: "var(--cs-shadow-lg)" } : undefined}>
              <Link href={`/studio/design?composition=${d.id}`} className="cs-design-img">{d.previewUrl ? <img src={d.previewUrl} alt={d.name} loading="lazy" /> : null}</Link>
              <div className="cs-design-body">
                <strong>{d.name}</strong>
                <span className="cs-muted" style={{ fontSize: 12 }}>Saved {d.createdAt.toLocaleDateString()}</span>
                <div className="cs-row" style={{ gap: 6 }}>
                  <Link href={`/studio/design?composition=${d.id}`} className="cs-btn cs-btn-primary cs-btn-sm" style={{ flex: 1 }}>Open</Link>
                  <DeleteDesignButton id={d.id} name={d.name} />
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {artwork.length > 0 && (
        <section className="cs-section">
          <div className="cs-section-head">
            <h2 className="cs-h2">Artwork & uploads</h2>
            <span className="cs-muted" style={{ fontSize: 14 }}>Use these in any design from the Uploads panel.</span>
          </div>
          <div className="cs-products" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))" }}>
            {artwork.slice(0, 36).map((a) => (
              <div key={a.id} className="cs-product" style={{ cursor: "default" }}>
                <div className="cs-product-img" style={{ background: "repeating-conic-gradient(#f1f1f1 0 25%, #fff 0 50%) 0 0/16px 16px" }}>{a.previewUrl ? <img src={a.previewUrl} alt="" style={{ objectFit: "contain" }} loading="lazy" /> : null}</div>
                <div className="cs-product-body"><strong>{a.name}</strong></div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
