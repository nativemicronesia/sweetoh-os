/**
 * Shown instantly on every partner navigation while the new page's data
 * loads — without this, a fully-dynamic route (auth + live DB reads on
 * every request) feels like the click did nothing for a second or two.
 * The sidebar/chat bar live in layout.tsx so only this content area swaps.
 */
export default function PartnerLoading() {
  return (
    <div className="animate-pulse space-y-8">
      <div className="space-y-2">
        <div className="h-6 w-40 rounded" style={{ background: "var(--so-dark)" }} />
        <div className="h-4 w-72 rounded" style={{ background: "var(--so-dark)" }} />
      </div>

      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-16 rounded-xl border"
            style={{ borderColor: "var(--so-border)", background: "var(--so-dark)" }}
          />
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-28 rounded-xl border"
            style={{ borderColor: "var(--so-border)", background: "var(--so-dark)" }}
          />
        ))}
      </div>
    </div>
  );
}
