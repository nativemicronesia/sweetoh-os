/**
 * Shown instantly on every partner navigation while the new page's data
 * loads — without this, a fully-dynamic route (auth + live DB reads on
 * every request) feels like the click did nothing for a second or two.
 * The sidebar/chat bar live in layout.tsx so only this content area swaps.
 */
export default function PartnerLoading() {
  return (
    <div role="status" aria-busy="true" className="space-y-7" style={{ minHeight: "55vh" }}>
      <span className="sr-only">Loading your workspace</span>
      <div aria-hidden="true" className="space-y-7 motion-safe:animate-pulse">
        <div className="space-y-3">
          <div className="h-9 w-52 rounded-lg" style={{ background: "color-mix(in srgb, var(--so-dark) 82%, var(--so-gold-dim))" }} />
          <div className="h-4 w-80 max-w-full rounded" style={{ background: "var(--so-dark)" }} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-36 rounded-2xl border" style={{ borderColor: "var(--so-border)", background: "var(--so-dark)" }} />
          ))}
        </div>
        <div className="h-72 rounded-2xl border" style={{ borderColor: "var(--so-border)", background: "var(--so-dark)" }} />
      </div>
    </div>
  );
}
