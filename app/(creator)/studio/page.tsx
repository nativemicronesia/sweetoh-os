import Link from "next/link";
import { ArrowRight, Check, MessageCircle, Palette } from "lucide-react";
import { requireCreator } from "@/lib/domains/identity/service";
import { getCreditBalance, getCreatorProfile } from "@/lib/domains/creator/credits";
import { listMemories } from "@/lib/domains/skink/memory";
import { listPartnerLibraryDesigns } from "@/lib/domains/catalog/partner-design-library";
import { listBuilderBlanks } from "@/lib/domains/intelligence/partner-builder";
import { listBestsellerBlueprints } from "@/lib/integrations/printify/catalog";
import { MascotCharacter } from "@/app/(store)/components/mascot-character";
import { SkinkChat } from "./components/skink-chat";

export const metadata = { title: "Home" };

export default async function StudioHome({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const session = await requireCreator();
  const [query, { plan }, profile, memories, designs, blanks, picks] = await Promise.all([
    searchParams,
    getCreditBalance(session.appUser.id),
    getCreatorProfile(session.appUser.id),
    listMemories(session.appUser.id),
    listPartnerLibraryDesigns(session.ventureId).catch(() => []),
    listBuilderBlanks(session).catch(() => []),
    listBestsellerBlueprints().catch(() => []),
  ]);
  const first = session.appUser.name?.split(" ")[0] ?? "creator";
  const saved = designs.filter((d) => d.isComposition);
  const steps = [
    { done: memories.some((m) => m.kind === "brand" || m.kind === "goal"), title: "Tell Skink your idea", text: "Your brand, audience, vibe", href: "/studio/skink" },
    { done: blanks.length > 0, title: "Pick a product", text: "Tees, hoodies, mugs & more", href: "/studio/catalog" },
    { done: saved.length > 0, title: "Design & save it", text: "AI, text, patterns, layers", href: saved.length ? "/studio/designs" : "/studio/catalog" },
    { done: Boolean(profile?.printifyShopId), title: "Connect Printify", text: "Your own store, your money", href: "/studio/settings" },
  ];
  const doneCount = steps.filter((s) => s.done).length;
  const greeting = memories.length
    ? `Welcome back, ${first}! I remember ${memories.length === 1 ? "one thing" : `${memories.length} things`} about your brand. Want to pick up where we left off, or start something new?`
    : `Hey ${first}, I'm Skink — your Sweet'Oh guide. Tell me what you want to create: a brand idea, a niche, or even just a vibe. I'll help you turn it into products people want to buy.`;

  return (
    <div className="cs-stack" style={{ gap: 28 }}>
      <section className="cs-hero">
        <div className="cs-eyebrow">{query.welcome ? "Welcome to Sweet'Oh" : "Create with Sweet'Oh"}</div>
        <h1>{query.welcome ? `Let's build your brand, ${first}.` : `What are we making today, ${first}?`}</h1>
        <p>Design on real print-on-demand products, learn the business with Skink, and send finished products straight to your own Printify store.</p>
        <div className="cs-hero-actions">
          <Link href="/studio/catalog" className="cs-btn cs-btn-lime cs-btn-lg">
            <Palette size={18} /> Start designing
          </Link>
          <Link href="/studio/skink" className="cs-btn cs-btn-lg" style={{ background: "rgba(255,255,255,.12)", color: "white", borderColor: "rgba(255,255,255,.25)" }}>
            <MessageCircle size={18} /> Ask Skink
          </Link>
        </div>
        <MascotCharacter size={150} className="cs-hero-skink" />
      </section>

      {doneCount < steps.length && (
        <section>
          <div className="cs-section-head">
            <div>
              <h2 className="cs-h2">Get set up</h2>
              <p className="cs-muted" style={{ margin: "4px 0 0", fontSize: 14 }}>{doneCount} of {steps.length} done</p>
            </div>
          </div>
          <div className="cs-steps">
            {steps.map((s, i) => (
              <Link key={s.title} href={s.href} className={`cs-step${s.done ? " done" : ""}`}>
                <span className="cs-step-dot">{s.done ? <Check size={15} /> : i + 1}</span>
                <span>
                  <strong>{s.title}</strong>
                  <span>{s.text}</span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="cs-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 420px), 1fr))", alignItems: "start" }}>
        <div className="cs-card" style={{ overflow: "hidden" }}>
          <div className="cs-between cs-pad" style={{ paddingBottom: 0 }}>
            <h2 className="cs-h2">Ask Skink</h2>
            <Link href="/studio/skink" className="cs-link">All chats <ArrowRight size={14} /></Link>
          </div>
          <SkinkChat
            compact
            levels={plan.levels}
            greeting={greeting}
            suggestions={[
              "Help me pick a niche I'd enjoy",
              "What sells best on print-on-demand?",
              "How do Printify, Etsy and Shopify fit together?",
              "Name ideas for an island-inspired brand",
            ]}
          />
        </div>

        <div className="cs-stack">
          <div className="cs-card cs-pad">
            <div className="cs-section-head" style={{ marginBottom: 12 }}>
              <h2 className="cs-h2">Popular products to start with</h2>
              <Link href="/studio/catalog" className="cs-link">Catalog <ArrowRight size={14} /></Link>
            </div>
            <div className="cs-products" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))" }}>
              {picks.slice(0, 6).map((b) => (
                <Link key={b.id} href={`/studio/catalog/printify-${b.id}`} className="cs-product">
                  <div className="cs-product-img">{b.images[0] ? <img src={b.images[0]} alt="" loading="lazy" /> : null}</div>
                  <div className="cs-product-body">
                    <strong>{b.title}</strong>
                    <span>{b.brand}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {saved.length > 0 && (
            <div className="cs-card cs-pad">
              <div className="cs-section-head" style={{ marginBottom: 12 }}>
                <h2 className="cs-h2">Recent designs</h2>
                <Link href="/studio/designs" className="cs-link">All designs <ArrowRight size={14} /></Link>
              </div>
              <div className="cs-products" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))" }}>
                {saved.slice(0, 6).map((d) => (
                  <Link key={d.id} href={`/studio/design?composition=${d.id}`} className="cs-product">
                    <div className="cs-product-img">{d.previewUrl ? <img src={d.previewUrl} alt="" style={{ objectFit: "contain" }} /> : null}</div>
                    <div className="cs-product-body"><strong>{d.name}</strong></div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {plan.id === "free" && (
            <div className="cs-founding">
              <div>
                <strong>Become a founding creator</strong>
                <p className="cs-muted" style={{ margin: "4px 0 0", fontSize: 14 }}>Smart Skink, unlimited designs and 20× the credits.</p>
              </div>
              <Link href="/studio/plans" className="cs-btn cs-btn-primary">See plans</Link>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
