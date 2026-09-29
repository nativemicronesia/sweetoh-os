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
  priceCents: number | null;
  image: string | null;
  ownership: "yours" | "shop";
  state: "private" | "ready" | "live" | "review" | "blank" | "archived" | "shop";
  stateLabel: string;
  href: string;
  actionLabel: string;
  builderHref: string | null;
};
const filters = [
  ["all", "All products"],
  ["private", "Private drafts"],
  ["ready", "Ready to publish"],
  ["live", "Live in shop"],
  ["review", "Review status"],
  ["blank", "Saved blanks"],
  ["shop", "Other shop listings"],
];
export function WorkspaceGallery({ cards, initialFilter }: { cards: Card[]; initialFilter?: string }) {
  const [filter, setFilter] = useState(filters.some(([value]) => value === initialFilter) ? initialFilter! : "all");
  const [search, setSearch] = useState("");
  const matches = (c: Card, value: string) =>
    value === "all" ? c.state !== "archived" : c.state === value;
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
                                {c.state === "live" && c.ownership === "yours"
                                  ? "Your live listing · visible in the shop"
                                  : c.state === "private"
                                    ? "Private draft · only you can see it"
                                    : c.stateLabel}
                              </small>
                            </span>
                          </Link>
                        </td>
                        <td>
                          <Badge
                            variant={
                              c.state === "live" || c.state === "ready" ? "default" : "secondary"
                            }
                          >
                            {c.state === "blank" ? "Saved blank" : c.stateLabel}
                          </Badge>
                        </td>
                        <td>
                          {c.priceCents === null ? <span style={{ color: "var(--pf-muted)" }}>Price not set</span> : formatPrice(c.priceCents)}
                        </td>
                        <td>
                          <div className="flex flex-wrap items-center gap-3">
                          <Link className="product-row-action" href={c.href}>
                            {c.actionLabel}
                            <ArrowRight size={15} />
                          </Link>
                          {c.builderHref && <Link className="text-xs underline" href={c.builderHref}>Product Builder</Link>}
                          </div>
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
                  {!search && cards.length === 0
                    ? "Your catalog starts here"
                    : search
                    ? "No matching products"
                    : filter === "live"
                      ? "No published products yet"
                      : filter === "ready"
                        ? "No products ready to publish"
                        : filter === "private"
                          ? "No private drafts need attention"
                      : "Create your first product"}
                </h3>
                <p>
                  {!search && cards.length === 0
                    ? "Add something you already make, or start from an undecorated product blank. Nothing is public until you choose to publish it."
                    : search
                    ? "Try another search term."
                    : filter === "shop"
                      ? "Your own products will appear in the other lifecycle groups."
                      : "Choose a product from the catalog and add your design."}
                </p>
                {!search && cards.length === 0 ? <div className="flex flex-wrap justify-center gap-3">
                  <Link href="/partner/list" className={buttonVariants({ size: "lg" })}>Add a product I make</Link>
                  <Link href="/partner/catalog" className={buttonVariants({ size: "lg", variant: "outline" })}>Start from a blank</Link>
                </div> : <Link href="/partner/catalog" className={buttonVariants({ size: "lg" })}>Browse catalog <ArrowRight size={16} /></Link>}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </section>
  );
}
