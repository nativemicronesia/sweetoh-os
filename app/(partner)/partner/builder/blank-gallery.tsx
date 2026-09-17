"use client";
import { useState } from "react";
import Link from "next/link";
export function BlankGallery({
  blanks,
}: {
  blanks: { id: string; name: string; imageUrl: string | null }[];
}) {
  const [search, setSearch] = useState("");
  const visible = blanks.filter((b) =>
    b.name.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <section>
      <div className="studio-section-heading">
        <h2>
          Your blank library <small>({blanks.length})</small>
        </h2>
        <input
          className="studio-search"
          aria-label="Search blanks"
          placeholder="Search your blanks"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div className="studio-product-grid">
        {visible.map((b) => (
          <Link
            key={b.id}
            href={`/partner/canvas?blank=${b.id}`}
            className="studio-product-card"
          >
            <div className="studio-product-image">
              {b.imageUrl ? (
                <img src={b.imageUrl} alt={b.name} />
              ) : (
                <span>Preview unavailable</span>
              )}
            </div>
            <div className="studio-product-info">
              <h3>{b.name}</h3>
              <span className="studio-card-action">
                Design this product <span>→</span>
              </span>
            </div>
          </Link>
        ))}
      </div>
      {!visible.length && (
        <p className="studio-empty">
          {search
            ? "No blanks match that search."
            : "Your library starts here. Upload a product photo below to make your first blank."}
        </p>
      )}
    </section>
  );
}
