import Link from "next/link";
import { FlashBanner } from "@/app/(owner)/owner/components/flash-banner";
import { listPartnerCatalog } from "@/lib/domains/catalog/partner-catalog";
import { listPartnerLibraryDesigns } from "@/lib/domains/catalog/partner-design-library";
import { requirePartnerWorkspace } from "@/lib/domains/identity/service";
import { DESIGN_TYPES, DESIGN_MAX_PX, DESIGN_EXPORT_DPI } from "@/lib/studio/design-canvas";

type PageProps = { searchParams: Promise<{ error?: string }> };

/**
 * Studio home. Studio is a standalone creative workspace: start a design on any
 * canvas, reopen saved designs, and only then decide which products use them.
 */
export default async function PartnerStudioPage({ searchParams }: PageProps) {
  const session = await requirePartnerWorkspace();
  const query = await searchParams;
  const [designs, catalog] = await Promise.all([
    listPartnerLibraryDesigns(session.ventureId),
    listPartnerCatalog(session).catch(() => []),
  ]);
  const standalone = designs.filter((d) => d.compositionKind === "standalone");
  const onProducts = designs.filter((d) => d.compositionKind === "product");
  const products = catalog.filter((p) => Boolean(p.imageUrl)).map((p) => ({ id: p.id, name: p.name }));

  return (
    <div className="space-y-8">
      <FlashBanner message={query.error} variant="error" />

      <header className="studio-page-heading">
        <div>
          <h1>Studio</h1>
          <p>Create designs on any canvas. Products use your designs — you don&apos;t need a product to start.</p>
        </div>
        <Link href="/partner/library" className="studio-primary">Creative Library &amp; files</Link>
      </header>

      <section aria-labelledby="studio-start">
        <div className="studio-section-heading"><h2 id="studio-start">Start a design</h2></div>
        <div className="studio-product-grid">
          {DESIGN_TYPES.map((type) => (
            <Link key={type.id} href={`/partner/canvas?new=${type.id}`} className="studio-product-card">
              <div className="studio-product-image" style={{ aspectRatio: "1.4" }}>
                <div aria-hidden style={{ width: `${Math.min(70, Math.max(26, 70 * Math.min(1, type.size.width / type.size.height)))}%`, aspectRatio: `${type.size.width} / ${type.size.height}`, maxHeight: "80%", background: "#fff", border: "1.5px dashed #286247", borderRadius: 4 }} />
              </div>
              <div className="studio-product-info">
                <h3>{type.name}</h3>
                <p className="studio-no-photo">{type.hint}</p>
              </div>
            </Link>
          ))}
          <form action="/partner/canvas" method="get" className="studio-new-card" style={{ alignItems: "stretch", textAlign: "left" }}>
            <input type="hidden" name="new" value="custom" />
            <strong>Custom size</strong>
            <div style={{ display: "flex", gap: 8 }}>
              <label className="studio-field" style={{ flex: 1 }}>Width<input name="w" type="number" min="0.1" step="any" required defaultValue="12" /></label>
              <label className="studio-field" style={{ flex: 1 }}>Height<input name="h" type="number" min="0.1" step="any" required defaultValue="12" /></label>
              <label className="studio-field" style={{ width: 70 }}>Unit
                <select name="unit" defaultValue="in"><option value="in">in</option><option value="cm">cm</option><option value="mm">mm</option><option value="px">px</option></select>
              </label>
            </div>
            <button type="submit" className="studio-primary">Create design</button>
            <small>Up to {DESIGN_MAX_PX} px a side ({DESIGN_MAX_PX / DESIGN_EXPORT_DPI} in at {DESIGN_EXPORT_DPI} DPI).</small>
          </form>
        </div>
      </section>

      <section aria-labelledby="studio-designs">
        <div className="studio-section-heading"><h2 id="studio-designs">Your designs</h2></div>
        {standalone.length === 0 ? (
          <p className="studio-empty">Nothing here yet. Start a design above — it saves to this list and can be reopened any time.</p>
        ) : (
          <ul className="studio-product-grid">
            {standalone.map((design) => (
              <li key={design.id} className="studio-product-card">
                <div className="studio-product-image">
                  {design.previewUrl
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={design.previewUrl} alt={design.name} loading="lazy" decoding="async" />
                    : <span className="studio-no-photo">No preview</span>}
                </div>
                <div className="studio-product-info" style={{ display: "grid", gap: 10 }}>
                  <h3>{design.name}</h3>
                  <p className="studio-no-photo">{design.createdAt.toLocaleDateString()}</p>
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap", fontSize: 12 }}>
                    <Link href={`/partner/canvas?composition=${design.id}`} className="studio-card-action" style={{ margin: 0 }}>Open</Link>
                    <Link href={`/partner/canvas?template=${design.id}`} className="studio-card-action" style={{ margin: 0 }}>Duplicate</Link>
                  </div>
                  {products.length > 0 && (
                    <form action="/partner/canvas" method="get" style={{ display: "grid", gap: 6 }}>
                      <input type="hidden" name="template" value={design.id} />
                      <label className="studio-field">Use on a product
                        <select name="blank" defaultValue={products[0].id}>{products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
                      </label>
                      <button type="submit" className="studio-primary" style={{ padding: "8px 12px" }}>Place on product</button>
                    </form>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="studio-products">
        <div className="studio-section-heading">
          <h2 id="studio-products">Design on a product</h2>
          <Link href="/partner/catalog" className="studio-card-action" style={{ margin: 0 }}>Choose a product →</Link>
        </div>
        <p className="studio-empty" style={{ paddingTop: 0 }}>
          Product Design opens this same Studio on a product&apos;s real print area. Its blank, sizes and print boundaries come from product data;
          mockups are only previews.
        </p>
        {onProducts.length > 0 && (
          <ul className="studio-product-grid">
            {onProducts.slice(0, 8).map((design) => (
              <li key={design.id} className="studio-product-card">
                <div className="studio-product-image">
                  {design.previewUrl
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={design.previewUrl} alt={design.name} loading="lazy" decoding="async" />
                    : <span className="studio-no-photo">No preview</span>}
                </div>
                <div className="studio-product-info">
                  <h3>{design.name}</h3>
                  <Link href={`/partner/canvas?composition=${design.id}`} className="studio-card-action"><span>Open product design</span><span>→</span></Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
