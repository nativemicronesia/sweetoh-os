/**
 * Covers the storefront pages that can't be ISR-cached (the homepage's
 * session check, product/collection detail, checkout success) so those
 * navigations get instant feedback instead of a silent pause. Cached pages
 * resolve fast enough that this rarely shows for them.
 */
export default function StoreLoading() {
  return (
    <div className="mx-auto w-full max-w-6xl animate-pulse space-y-10 px-5 py-12 sm:px-8 sm:py-16">
      <div className="space-y-3">
        <div className="h-3 w-16 rounded" style={{ background: "var(--so-border)" }} />
        <div className="h-10 w-72 rounded" style={{ background: "var(--so-border)" }} />
      </div>
      <div className="grid gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="space-y-3">
            <div className="aspect-square rounded" style={{ background: "var(--so-border)" }} />
            <div className="h-4 w-3/4 rounded" style={{ background: "var(--so-border)" }} />
          </div>
        ))}
      </div>
    </div>
  );
}
