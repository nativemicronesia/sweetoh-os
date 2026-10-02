import Link from "next/link";
import { FlashBanner } from "@/app/(owner)/owner/components/flash-banner";
import { DESIGN_TYPES, DESIGN_MAX_PX, DESIGN_EXPORT_DPI } from "@/lib/studio/design-canvas";
import { TemplateShelf } from "./template-shelf";

export type StudioHomeDesign = { id: string; name: string; previewUrl: string | null; createdAt: Date; compositionKind: "standalone" | "product" | null };

/** A page drawn at the type's true proportions inside a fixed frame. */
function TypeShape({ width, height }: { width: number; height: number }) {
  const aspect = width / height;
  const wide = aspect >= 1.2;
  return <span className="sh-shape" aria-hidden><i style={wide ? { width: "76%", aspectRatio: String(aspect) } : { height: "76%", aspectRatio: String(aspect) }} /></span>;
}

function DesignCard({ design, products }: { design: StudioHomeDesign; products: { id: string; name: string }[] }) {
  return (
    <li className="sh-card">
      <Link href={`/partner/canvas?composition=${design.id}`} className="sh-thumb" aria-label={`Open ${design.name}`}>
        {design.previewUrl
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={design.previewUrl} alt="" loading="lazy" decoding="async" />
          : <span>No preview</span>}
      </Link>
      <div className="sh-meta">
        <div><strong>{design.name}</strong><small>Edited {design.createdAt.toLocaleDateString()}</small></div>
        {design.compositionKind === "standalone" && (
          <details className="sh-menu">
            <summary aria-label={`More for ${design.name}`}>⋯</summary>
            <div>
              <Link href={`/partner/canvas?composition=${design.id}`}>Open</Link>
              <Link href={`/partner/canvas?template=${design.id}`}>Duplicate</Link>
              {products.length > 0 && (
                <form action="/partner/canvas" method="get">
                  <input type="hidden" name="template" value={design.id} />
                  <label>Use on a product
                    <select name="blank" defaultValue={products[0].id}>{products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
                  </label>
                  <button type="submit">Place on product</button>
                </form>
              )}
            </div>
          </details>
        )}
      </div>
    </li>
  );
}

/**
 * Studio home: a standalone creative workspace. Start a design on any canvas,
 * reopen saved designs, and only then decide which products use them.
 */
export function StudioHome({ designs, products, error }: { designs: StudioHomeDesign[]; products: { id: string; name: string }[]; error?: string }) {
  const standalone = designs.filter((d) => d.compositionKind === "standalone");
  const onProducts = designs.filter((d) => d.compositionKind === "product");
  return (
    <div className="sh so-reveal">
      <FlashBanner message={error} variant="error" />

      <header className="sh-head">
        <div>
          <h1>Studio</h1>
          <p>Design on any canvas. Products use your designs — you don&apos;t need a product to start.</p>
        </div>
        <div className="sh-actions">
          <Link href="/partner/library" className="sh-ghost">Files &amp; Creative Library</Link>
          <details className="sh-custom">
            <summary className="sh-primary">＋ Custom size</summary>
            <form action="/partner/canvas" method="get">
              <input type="hidden" name="new" value="custom" />
              <div className="sh-custom-row">
                <label>Width<input name="w" type="number" min="0.1" step="any" required defaultValue="12" /></label>
                <label>Height<input name="h" type="number" min="0.1" step="any" required defaultValue="12" /></label>
                <label>Unit<select name="unit" defaultValue="in"><option value="in">in</option><option value="cm">cm</option><option value="mm">mm</option><option value="px">px</option></select></label>
              </div>
              <button type="submit" className="sh-primary">Create design</button>
              <small>Up to {DESIGN_MAX_PX} px a side ({DESIGN_MAX_PX / DESIGN_EXPORT_DPI} in at {DESIGN_EXPORT_DPI} DPI).</small>
            </form>
          </details>
        </div>
      </header>

      <section aria-labelledby="sh-start">
        <h2 id="sh-start">Start a design</h2>
        <ul className="sh-types">
          {DESIGN_TYPES.map((type) => (
            <li key={type.id}>
              <Link href={`/partner/canvas?new=${type.id}`} className="sh-type">
                <TypeShape width={type.size.width} height={type.size.height} />
                <strong>{type.name}</strong>
                <small>{type.hint}</small>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="sh-templates">
        <h2 id="sh-templates">Start from a template</h2>
        <TemplateShelf />
      </section>

      <section aria-labelledby="sh-designs">
        <h2 id="sh-designs">Your designs</h2>
        {standalone.length === 0
          ? <p className="sh-empty">Nothing here yet. Pick a design type above — designs save automatically and can be reopened any time.</p>
          : <ul className="sh-grid">{standalone.map((d) => <DesignCard key={d.id} design={d} products={products} />)}</ul>}
      </section>

      <section aria-labelledby="sh-products">
        <div className="sh-row">
          <h2 id="sh-products">Design on a product</h2>
          <Link href="/partner/catalog" className="sh-link">Choose a product →</Link>
        </div>
        <p className="sh-note">Product Design opens this same Studio on a product&apos;s real print area. Blanks, sizes and print boundaries come from product data; mockups are only previews.</p>
        {onProducts.length > 0 && <ul className="sh-grid">{onProducts.slice(0, 8).map((d) => <DesignCard key={d.id} design={d} products={[]} />)}</ul>}
      </section>
    </div>
  );
}
