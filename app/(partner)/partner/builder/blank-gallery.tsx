"use client";
import { useState } from "react";
import Link from "next/link";
import { Search, Package, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  PRODUCT_CATEGORY_META,
  categoryLabel,
  type ProductCategory,
} from "@/lib/domains/catalog/categories";
import { sizedPhoto } from "@/lib/studio/photo";
export function BlankGallery({
  blanks,
  hrefBase = "/partner/catalog",
  tagline = "Choose a blank for your local shop",
}: {
  hrefBase?: string;
  tagline?: string;
  blanks: {
    id: string;
    name: string;
    imageUrl: string | null;
    category: ProductCategory;
    brand?: string;
    model?: string;
  }[];
}) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [sort, setSort] = useState("ready");
  const visible = blanks
    .filter(
      (b) =>
        (category === "all" || b.category === category) &&
        [b.name, b.brand, b.model]
          .join(" ")
          .toLowerCase()
          .includes(search.trim().toLowerCase()),
    )
    .sort((a, b) =>
      sort === "name"
        ? a.name.localeCompare(b.name)
        : Number(Boolean(b.imageUrl)) - Number(Boolean(a.imageUrl)),
    );
  return (
    <section className="catalog-layout" aria-label="Product catalog">
      <aside className="catalog-categories">
        <h2>Categories</h2>
        {[
          { value: "all", label: "All products" },
          ...PRODUCT_CATEGORY_META,
        ].map((c) => (
          <button
            key={c.value}
            aria-pressed={category === c.value}
            onClick={() => {
              setCategory(c.value);
              setPage(1);
            }}
          >
            {c.label}
            <span>
              {
                blanks.filter(
                  (b) => c.value === "all" || b.category === c.value,
                ).length
              }
            </span>
          </button>
        ))}
      </aside>
      <div className="min-w-0">
        <div className="catalog-toolbar">
          <label className="catalog-search">
            <Search size={18} />
            <Input
              aria-label="Search catalog"
              placeholder="Search products…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </label>
          <label className="catalog-sort">
            Sort by
            <select
              aria-label="Sort products"
              value={sort}
              onChange={(e) => {
                setSort(e.target.value);
                setPage(1);
              }}
            >
              <option value="ready">Ready to design</option>
              <option value="name">Name: A–Z</option>
            </select>
          </label>
        </div>
        <p className="mb-5 text-sm text-muted-foreground" aria-live="polite">
          {visible.length} {visible.length === 1 ? "product" : "products"} ·
          {tagline}
        </p>
        <div className="studio-product-grid catalog-grid">
          {visible.slice((page - 1) * 24, page * 24).map((b) => (
            <Link
              key={b.id}
              href={`${hrefBase}/${b.id}`}
              className="studio-product-card"
            >
              <div className="studio-product-image">
                {b.imageUrl ? (
                  <img src={sizedPhoto(b.imageUrl, 800)} alt={b.name} loading="lazy" />
                ) : (
                  <div className="catalog-no-image">
                    <Package size={44} strokeWidth={1} />
                    <span>Product photo needed</span>
                  </div>
                )}
              </div>
              <div className="studio-product-info">
                <Badge variant="secondary">{categoryLabel(b.category)}</Badge>
                <h3 className="mt-3">{b.name}</h3>
                <p className="mt-2 text-xs text-muted-foreground">
                  {b.brand
                    ? [b.brand, b.model].filter(Boolean).join(" · ")
                    : "Your saved blank"}
                </p>
                <span className="studio-card-action">
                  {b.imageUrl ? "Choose product" : "Set up product"}
                  <ArrowRight size={16} />
                </span>
              </div>
            </Link>
          ))}
        </div>
        {visible.length > 24 && (
          <div className="catalog-pagination">
            <Button
              variant="outline"
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </Button>
            <span>
              Page {page} of {Math.ceil(visible.length / 24)}
            </span>
            <Button
              variant="outline"
              disabled={page * 24 >= visible.length}
              onClick={() => setPage(page + 1)}
            >
              Next
            </Button>
          </div>
        )}
        {!visible.length && (
          <div className="catalog-empty">
            <Package size={36} />
            <h3>No products found</h3>
            <p>Try another category or search term.</p>
            <Button
              variant="outline"
              onClick={() => {
                setSearch("");
                setCategory("all");
                setPage(1);
              }}
            >
              Clear filters
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
