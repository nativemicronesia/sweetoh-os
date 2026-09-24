import Link from "next/link";
import { countNewRequests } from "@/lib/domains/customers/custom-requests";
import {
  ArrowRight,
  ArrowUpRight,
  Camera,
  BookOpen,
  Check,
  Inbox,
  PenTool,
  ShoppingBag,
  Store,
  Tag,
} from "lucide-react";
import { latestThreads } from "@/lib/domains/inbox/service";
import { getFeaturedProductsForHome } from "@/app/(store)/components/featured-products";
import { MadeToOrderSticker } from "@/app/(store)/components/store-hero";
import { ISLAND_GREETINGS } from "@/lib/shared/island-greetings";
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

  const [drafts, published, jobs, customRequests, picks, creatorOpen, newCustom, mail, featured] =
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
      latestThreads(session.ventureId, 5).catch(() => []),
      getFeaturedProductsForHome(session.ventureId).catch(() => []),
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
  const unreadMail = mail.filter(({ thread }) => thread.unread).length;
  const onPress = jobs.filter(({ job }) => ["new", "in_production"].includes(job.status)).length;
  const greeting = ISLAND_GREETINGS[Math.floor(Date.now() / 86_400_000) % ISLAND_GREETINGS.length];
  const shelf = featured.filter((f) => f.imageUrl).slice(0, 3);
  const hour = Number(new Date().toLocaleString("en-US", { timeZone: "America/Los_Angeles", hour: "numeric", hour12: false }));
  const partOfDay = hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening";

  const today = [
    unreadMail > 0 && <><b>{unreadMail} new {unreadMail === 1 ? "message" : "messages"}</b> waiting</>,
    onPress > 0 && <><b>{onPress} {onPress === 1 ? "order" : "orders"}</b> for the press</>,
    newCustom > 0 && <><b>{newCustom} custom {newCustom === 1 ? "request" : "requests"}</b> to answer</>,
  ].filter(Boolean);

  return (
    <div className="ho">
      <header className="ho-hero">
        <span className="so-pattern-layer" />
        <div>
          <p className="ho-eyebrow">
            {greeting.place} says {greeting.greeting} · Good {partOfDay}
          </p>
          <h1 className="so-display">
            {greeting.greeting}
            {firstName ? (
              <>
                , <span className="so-scribble">
                  <em>{firstName}</em>
                  <svg viewBox="0 0 300 24" preserveAspectRatio="none" aria-hidden>
                    <path d="M4 16 C 60 4, 120 22, 180 10 S 270 8, 296 14" fill="none" stroke="var(--so-coral)" strokeWidth="7" strokeLinecap="round" />
                  </svg>
                </span>
                .
              </>
            ) : (
              "."
            )}
          </h1>
          <p className="ho-today">
            {today.length ? (
              <>
                Today:{" "}
                {today.map((part, i) => (
                  <span key={i}>
                    {i > 0 && (i === today.length - 1 ? " and " : ", ")}
                    {part}
                  </span>
                ))}
                .
              </>
            ) : (
              <>All caught up — no new mail, nothing waiting on the press. A good day to list something new.</>
            )}
          </p>
          <div className="ho-actions">
            <Link href="/partner/list" className="pf-btn pf-btn-primary pf-btn-lg">
              <Camera size={16} /> Add something I make
            </Link>
            <Link href="/partner/catalog" className="pf-btn pf-btn-ghost pf-btn-lg">
              Design a new one <ArrowRight size={16} />
            </Link>
          </div>
        </div>
        <MadeToOrderSticker id="ho-sticker" className="ho-sticker" />
      </header>

      <section className="ho-tiles" aria-label="Shop at a glance">
        <Link href="/partner/inbox" className="ho-tile so-lift" data-tone="lagoon">
          <span className="so-pattern-layer" />
          <span className="ho-tile-top">
            <span className="so-tag">Inbox</span>
            <ArrowUpRight size={20} />
          </span>
          <span>
            <strong>{unreadMail}</strong>
            <span className="ho-tile-label">{unreadMail === 1 ? "New message" : "New messages"}</span>
          </span>
        </Link>
        <Link href="/partner/orders" className="ho-tile so-lift" data-tone="coral">
          <span className="so-pattern-layer" />
          <span className="ho-tile-top">
            <span className="so-tag">Press</span>
            <ArrowUpRight size={20} />
          </span>
          <span>
            <strong>{toProduce}</strong>
            <span className="ho-tile-label">Orders to make &amp; ship</span>
          </span>
        </Link>
        <Link href="/partner/custom-requests" className="ho-tile so-lift" data-tone="sun">
          <span className="so-pattern-layer" />
          <span className="ho-tile-top">
            <span className="so-tag">Custom</span>
            <ArrowUpRight size={20} />
          </span>
          <span>
            <strong>{newCustom + customJobs}</strong>
            <span className="ho-tile-label">Custom requests open</span>
          </span>
        </Link>
        <Link href="/partner/products" className="ho-tile so-lift" data-tone="reef">
          <span className="so-pattern-layer" />
          <span className="ho-tile-top">
            <span className="so-tag">{inProgress} in progress</span>
            <ArrowUpRight size={20} />
          </span>
          <span>
            <strong>{published.length}</strong>
            <span className="ho-tile-label">{published.length === 1 ? "Product live in the shop" : "Products live in the shop"}</span>
          </span>
        </Link>
      </section>

      {creatorOpen > 0 && (
        <Link href="/partner/creator-requests" className="ho-card" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, textDecoration: "none", color: "inherit" }}>
          <span>
            <strong>{creatorOpen} creator {creatorOpen === 1 ? "request needs" : "requests need"} you</strong>
            <span style={{ display: "block", fontSize: 13, color: "var(--pf-muted)" }}>Print jobs from Sweet&apos;Oh AI creators — separate from your shop orders.</span>
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

      <div className="ho-grid">
        <section className="ho-card">
          <div className="ho-card-head">
            <h2>Latest mail</h2>
            <Link href="/partner/inbox">Open inbox</Link>
          </div>
          {mail.length ? (
            <ul className="ho-list">
              {mail.map(({ thread, snippet }) => (
                <li key={thread.id}>
                  <Link href={`/partner/inbox?t=${thread.id}`}>
                    {thread.unread ? <span className="ho-dot" aria-label="Unread" /> : null}
                    <span className="ho-list-main">
                      <strong>{thread.counterpartName ?? thread.counterpartEmail}</strong>
                      <small>
                        {thread.subject}
                        {snippet ? ` — ${snippet}` : ""}
                      </small>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="ho-empty">
              <span className="so-pattern-layer" />
              <Inbox size={26} strokeWidth={1.5} />
              <p>When customers email your shop, their messages show up here and in your Gmail.</p>
            </div>
          )}

          <div className="ho-card-head" style={{ marginTop: 22 }}>
            <h2>On the press</h2>
            <Link href="/partner/orders">All orders</Link>
          </div>
          {recent.length ? (
            <ul className="ho-list">
              {recent.map(({ job, lineItem }) => (
                <li key={job.id}>
                  <Link href={`/partner/orders/${job.id}`}>
                    <span className="ho-list-main">
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
            <div className="ho-empty">
              <span className="so-pattern-layer" />
              <ShoppingBag size={26} strokeWidth={1.5} />
              <p>No orders yet. When a customer checks out, the job lands here, ready to print.</p>
            </div>
          )}
        </section>

        <section className="ho-window" aria-label="Your shop window">
          <span className="so-pattern-layer" />
          <div className="ho-card-head">
            <h2>Your shop window</h2>
            <Link href="/" target="_blank">
              Visit <ArrowUpRight size={13} style={{ display: "inline", verticalAlign: -2 }} />
            </Link>
          </div>
          <p>
            {published.length
              ? `This is what customers see first at sweetohcreations.shop — ${published.length} ${published.length === 1 ? "piece" : "pieces"} live.`
              : "Nothing is live yet. Your first published piece shows up here and on the shop’s front page."}
          </p>
          <div className="ho-shelf">
            {shelf.length
              ? shelf.map((f) => (
                  <Link key={f.product.id} href={`/products/${f.product.slug}`} target="_blank">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={f.imageUrl!} alt="" loading="lazy" />
                    <span>{f.product.name}</span>
                  </Link>
                ))
              : ["Tees", "Tumblers", "Little ones"].map((label, i) => (
                  <Link key={label} href="/partner/list">
                    <span className="ho-shelf-blank" style={{ background: ["var(--so-lagoon)", "var(--so-coral)", "var(--so-sun)"][i] }} />
                    <span>{label} — add yours</span>
                  </Link>
                ))}
          </div>
          <div className="ho-window-foot">
            <Link href="/partner/list">
              <Camera size={14} /> List a piece
            </Link>
            <Link href="/partner/products">
              <Tag size={14} /> Manage products
            </Link>
          </div>
        </section>
      </div>

      <section className="ho-card">
        <div className="ho-card-head">
          <h2>Start with a bestseller</h2>
          <Link href="/partner/catalog">See catalog</Link>
        </div>
        {picks.length ? (
          <div className="ho-picks">
            {picks.map((b) => (
              <Link key={b.id} href={`/partner/catalog/printify-${b.id}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={sizedPhoto(b.images[0], 800)} alt="" loading="lazy" />
                <span>{b.title}</span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="ho-empty">
            <span className="so-pattern-layer" />
            <BookOpen size={26} strokeWidth={1.5} />
            <p>Browse tees, hoodies, mugs and more in the catalog.</p>
          </div>
        )}
      </section>
    </div>
  );
}
