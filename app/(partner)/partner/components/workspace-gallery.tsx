"use client";
import { useState } from "react";
import Link from "next/link";
import { Package, Search, ArrowRight } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { formatPrice } from "@/lib/shared/format";
type Card = {
  id: string;
  name: string;
  priceCents: number;
  image: string | null;
  kind: string;
  href: string;
  action: string | null;
};
const filters = [
  ["all", "All products"],
  ["draft", "Drafts"],
  ["live", "Published"],
  ["blank", "Saved blanks"],
];
export function WorkspaceGallery({ cards }: { cards: Card[] }) {
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const matches = (c: Card, value: string) =>
    value === "all" ? c.kind !== "blank" : c.kind === value;
  const visible = cards.filter(
    (c) =>
      matches(c, filter) &&
      c.name.toLowerCase().includes(search.trim().toLowerCase()),
  );
  return (
    <section className="space-y-5">
      <label className="catalog-search block max-w-md">
        <Search size={18} />
        <Input
          aria-label="Search your products"
          placeholder="Search your products…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </label>
      <Tabs value={filter} onValueChange={(value) => setFilter(String(value))}>
        <TabsList
          variant="line"
          className="product-tabs"
          aria-label="Filter products"
        >
          {filters.map(([value, label]) => (
            <TabsTrigger key={value} value={value}>
              {label}
              <Badge variant="secondary">
                {cards.filter((c) => matches(c, value)).length}
              </Badge>
            </TabsTrigger>
          ))}
        </TabsList>
        {filters.map(([value]) => (
          <TabsContent key={value} value={value}>
            {visible.length ? (
              <div className="product-table-wrap">
                <table className="product-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Status</th>
                      <th>Retail price</th>
                      <th>
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((c) => (
                      <tr key={c.id}>
                        <td>
                          <Link className="product-table-name" href={c.href}>
                            {c.image ? (
                              <img src={c.image} alt="" />
                            ) : (
                              <Package size={28} />
                            )}
                            <span>
                              {c.name}
                              <small>
                                {c.kind === "blank"
                                  ? "Reusable product blank"
                                  : "Sweet’Oh local production"}
                              </small>
                            </span>
                          </Link>
                        </td>
                        <td>
                          <Badge
                            variant={
                              c.kind === "live" ? "default" : "secondary"
                            }
                          >
                            {c.kind === "blank"
                              ? "Blank"
                              : c.kind === "live"
                                ? "Published"
                                : "Draft"}
                          </Badge>
                        </td>
                        <td>
                          {c.priceCents > 0 ? formatPrice(c.priceCents) : "—"}
                        </td>
                        <td>
                          <Link
                            className="product-row-action"
                            href={c.action ?? c.href}
                          >
                            {c.action
                              ? "Start designing"
                              : c.kind === "live"
                                ? "Manage"
                                : "Continue"}
                            <ArrowRight size={15} />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="catalog-empty">
                <Package size={40} strokeWidth={1.5} />
                <h3>
                  {search
                    ? "No matching products"
                    : filter === "live"
                      ? "No published products yet"
                      : "Create your first product"}
                </h3>
                <p>
                  {search
                    ? "Try another search term."
                    : "Choose a product from the catalog and add your design."}
                </p>
                <Link
                  href="/partner/catalog"
                  className={buttonVariants({ size: "lg" })}
                >
                  Browse catalog <ArrowRight size={16} />
                </Link>
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </section>
  );
}
