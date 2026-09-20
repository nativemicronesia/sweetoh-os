/** An instant frame, so a slow page never shows a blank screen. */
export default function StudioLoading() {
  return (
    <div className="cs-stack" aria-busy="true" aria-label="Loading">
      <div className="cs-skeleton" style={{ height: 170, borderRadius: 26 }} />
      <div className="cs-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 260px), 1fr))" }}>
        {[0, 1, 2].map((i) => (
          <div key={i} className="cs-skeleton" style={{ height: 120 }} />
        ))}
      </div>
      <div className="cs-skeleton" style={{ height: 320 }} />
    </div>
  );
}
