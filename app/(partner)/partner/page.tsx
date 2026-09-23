import Link from "next/link";
import { countNewRequests } from "@/lib/domains/customers/custom-requests";
import {
  ArrowRight,
  Camera,
  BookOpen,
  Check,
  Package,
  PenTool,
  ShoppingBag,
  Store,
  Tag,
} from "lucide-react";
import { requirePartnerWorkspace } from "@/lib/domains/identity/service";
import { listActorProductDrafts } from "@/lib/domains/intelligence/service";
import { builderRecord } from "@/lib/domains/intelligence/product-research-schema";
import { listActiveProducts } from "@/lib/domains/catalog/service";
import { listFulfillmentJobs } from "@/lib/domains/fulfillment";
import { listCustomerCustomizationRequests } from "@/lib/domains/studio/service";
import { isPartnerProductionJobStatus } from "@/lib/domains/studio/customer-request";
import { listBestsellerBlueprints } from "@/lib/integrations/printify/catalog";
import { formatPrice } from "@/lib/shared/format";
import { OperationsOverview } from "./components/operations-overview";
import { countOpenShopRequests } from "@/lib/domains/creator/print-requests";
import { sizedPhoto } from "@/lib/studio/photo";

const JOB_LABEL: Record<string, string> = {
  new: "New",
  in_production: "In production",
  ready_to_ship: "Ready to ship",
  shipped: "Shipped",
  delivered: "Delivered",
};

export default async function PartnerHomePage() {
  const session = await requirePartnerWorkspace();
  if (session.role === "creator") return <OperationsOverview />;

  const [drafts, published, jobs, customRequests, picks, creatorOpen, newCustom] =
    await Promise.all([
      listActorProductDrafts({
        ventureId: session.ventureId,
        actorUserId: session.appUser.id,
      }),
      listActiveProducts(session.ventureId),
      listFulfillmentJobs({ ventureId: session.ventureId, path: "sweetoh" }),
      listCustomerCustomizationRequests(session.ventureId),
      listBestsellerBlueprints(),
      countOpenShopRequests(session.ventureId).catch(() => 0),
      countNewRequests(session).catch(() => 0),
    ]);

  const open = drafts.filter(({ product }) => product.draftStatus !== "archived");
  const blanks = open.filter(
    ({ session: d }) => builderRecord(d.rawResponse)?.purpose === "blank",
  ).length;
  const designed = open.length - blanks;
  const inProgress = open.filter(
    ({ product, session: d }) =>
      !product.active && builderRecord(d.rawResponse)?.purpose !== "blank",
  ).length;
  const toProduce = jobs.filter(({ job }) =>
    ["new", "in_production", "ready_to_ship"].includes(job.status),
  ).length;
  const customJobs = customRequests.filter((r) =>
    isPartnerProductionJobStatus(r.status),
  ).length;
  const recent = [...jobs]
    .sort((a, b) => +new Date(b.job.createdAt) - +new Date(a.job.createdAt))
    .slice(0, 5);

  const steps = [
    {
      done: blanks > 0,
      title: "Choose a product",
      body: "Pick a blank from the catalog — tees, hoodies, mugs and more.",
      href: "/partner/catalog",
      cta: "Browse catalog",
      icon: BookOpen,
    },
    {
      done: designed > 0,
      title: "Add your design",
      body: "Upload artwork or add text, then preview your mockup.",
      href: "/partner/catalog",
      cta: "Start designing",
      icon: PenTool,
    },
    {
      done: published.length > 0,
      title: "Set your price and publish",
      body: "Name it, price it, and put it live in your store.",
      href: "/partner/products",
      cta: "Go to my products",
      icon: Tag,
    },
    {
      done: jobs.length > 0,
      title: "Get your first order",
      body: "Share your store. Orders land here, ready to print locally.",
      href: "/",
      cta: "View your store",
      icon: Store,
    },
  ];
  const doneCount = steps.filter((s) => s.done).length;
  const allDone = doneCount === steps.length;
  const firstName = (session.appUser.name ?? "").split(" ")[0];

  return (
    <div className="home">
      <header className="home-hero">
        <div>
          <h1>{firstName ? `Welcome back, ${firstName}` : "Welcome back"}</h1>
          <p>Here’s what’s happening in your shop today.</p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link href="/partner/list" className="pf-btn pf-btn-primary pf-btn-lg">
            <Camera size={16} /> Add a product I already make
          </Link>
          <Link href="/partner/catalog" className="pf-btn pf-btn-lg" style={{ background: "#fff", border: "1px solid var(--so-border)" }}>
            Design a new one <ArrowRight size={16} />
          </Link>
        </div>
      </header>

      {newCustom > 0 && (
        <Link href="/partner/custom-requests" className="home-card" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, textDecoration: "none" }}>
          <span>
            <strong>{newCustom} new custom {newCustom === 1 ? "request" : "requests"} from customers</strong>
            <span style={{ display: "block", fontSize: 13, color: "var(--so-cream-dim)" }}>Reply by email, then mark them contacted.</span>
          </span>
          <ArrowRight size={18} />
        </Link>
      )}

      {creatorOpen > 0 && (
        <Link href="/partner/creator-requests" className="home-card" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, textDecoration: "none" }}>
          <span>
            <strong>{creatorOpen} creator {creatorOpen === 1 ? "request needs" : "requests need"} you</strong>
            <span style={{ display: "block", fontSize: 13, color: "var(--so-cream-dim)" }}>Print jobs from Sweet&apos;Oh AI creators — separate from your shop orders.</span>
          </span>
          <ArrowRight size={18} />
        </Link>
      )}

      {!allDone && (
        <section className="home-card home-setup" aria-labelledby="setup-title">
          <div className="home-setup-head">
            <div>
              <h2 id="setup-title">Let’s get your shop selling</h2>
              <p>
                {doneCount} of {steps.length} steps complete
              </p>
            </div>
            <div
              className="home-progress"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={steps.length}
              aria-valuenow={doneCount}
            >
              <span style={{ width: `${(doneCount / steps.length) * 100}%` }} />
            </div>
          </div>
          <ol className="home-steps">
            {steps.map((s, i) => {
              const Icon = s.icon;
              const current = !s.done && steps.slice(0, i).every((p) => p.done);
              return (
                <li key={s.title} data-done={s.done} data-current={current}>
                  <span className="home-step-icon">
                    {s.done ? <Check size={18} strokeWidth={2.5} /> : <Icon size={18} />}
                  </span>
                  <div>
                    <h3>{s.title}</h3>
                    <p>{s.body}</p>
                  </div>
                  {!s.done && (
                    <Link
                      href={s.href}
                      target={s.href === "/" ? "_blank" : undefined}
                      className={`pf-btn ${current ? "pf-btn-primary" : "pf-btn-ghost"}`}
                    >
                      {s.cta}
                    </Link>
                  )}
                </li>
              );
            })}
          </ol>
        </section>
      )}

      <section className="home-stats" aria-label="Shop at a glance">
        <Link href="/partner/products" className="home-card home-stat">
          <Package size={20} />
          <strong>{published.length}</strong>
          <span>Products live</span>
        </Link>
        <Link href="/partner/products" className="home-card home-stat">
          <PenTool size={20} />
          <strong>{inProgress}</strong>
          <span>Drafts in progress</span>
        </Link>
        <Link href="/partner/orders" className="home-card home-stat">
          <ShoppingBag size={20} />
          <strong>{toProduce}</strong>
          <span>Orders to produce</span>
        </Link>
        <Link href="/partner/orders?tab=custom" className="home-card home-stat">
          <Store size={20} />
          <strong>{customJobs}</strong>
          <span>Custom requests</span>
        </Link>
      </section>

      <div className="home-grid">
        <section className="home-card">
          <div className="home-card-head">
            <h2>Recent orders</h2>
            <Link href="/partner/orders">View all</Link>
          </div>
          {recent.length ? (
            <ul className="home-orders">
              {recent.map(({ job, lineItem }) => (
                <li key={job.id}>
                  <Link href={`/partner/orders/${job.id}`}>
                    <span>
                      <strong>{lineItem.productName}</strong>
                      <small>
                        {[lineItem.color, lineItem.size].filter(Boolean).join(" / ")}
                        {lineItem.color || lineItem.size ? " · " : ""}Qty {lineItem.quantity} ·{" "}
                        {formatPrice(lineItem.priceCentsAtPurchase * lineItem.quantity)}
                      </small>
                    </span>
                    <em data-status={job.status}>{JOB_LABEL[job.status] ?? job.status}</em>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="home-empty">
              <ShoppingBag size={28} strokeWidth={1.5} />
              <p>No orders yet. When a customer checks out, it shows up here.</p>
            </div>
          )}
        </section>

        <section className="home-card">
          <div className="home-card-head">
            <h2>Start with a bestseller</h2>
            <Link href="/partner/catalog">See catalog</Link>
          </div>
          {picks.length ? (
            <div className="home-picks">
              {picks.map((b) => (
                <Link key={b.id} href={`/partner/catalog/printify-${b.id}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={sizedPhoto(b.images[0], 800)} alt="" loading="lazy" />
                  <span>{b.title}</span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="home-empty">
              <BookOpen size={28} strokeWidth={1.5} />
              <p>Browse tees, hoodies, mugs and more in the catalog.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
