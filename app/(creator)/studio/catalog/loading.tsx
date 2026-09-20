export default function CatalogLoading() {
  return (
    <div className="cs-stack" aria-busy="true" aria-label="Loading the catalog">
      <div className="cs-skeleton" style={{ height: 90, maxWidth: 520 }} />
      <div className="cs-products">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="cs-skeleton" style={{ aspectRatio: "0.82", borderRadius: 18 }} />
        ))}
      </div>
    </div>
  );
}
