import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getDefaultVenture } from "@/lib/domains/identity/service";
import { ISLAND_GREETINGS } from "@/lib/shared/island-greetings";
import { FeaturedProducts, getFeaturedProductsForHome } from "./components/featured-products";
import { Reveal } from "./components/reveal";
import { ObjectWall } from "./components/scenes/object-wall";
import { GlobeLazy } from "./components/scenes/globe-lazy";
import { TransformScene } from "./components/scenes/transform-scene";

export const metadata = {
  title: "Sweet'Oh Creations: bring an idea, leave with something real",
  description: "Design it in Studio, bring us a photo or a thought, or shop what's ready. Sweet'Oh makes ideas into real things, in Lacey, Washington.",
};

const DOOR_LIST = [
  { cls: "idea", n: "01", href: "/custom", title: "Bring us an idea", body: "A photo, a few words, an occasion. Tell us what you're picturing and we'll design it and make it.", cta: "Start a request" },
  { cls: "studio", n: "02", href: "/design", title: "Design in Studio", body: "Make it yourself, from a blank page or a photo.", cta: "See Studio" },
  { cls: "shop", n: "03", href: "/collections", title: "Shop what's ready", body: "Pieces we've already made.", cta: "Browse" },
  { cls: "yours", n: "04", href: "/custom?from=personalize", title: "Make one yours", body: "Names, dates, faces, in-jokes.", cta: "Personalize" },
  { cls: "made", n: "05", href: "/make", title: "What we can make", body: "From a tee to an engraving.", cta: "Explore" },
] as const;

export default async function HomePage() {
  const venture = await getDefaultVenture();
  const featured = await getFeaturedProductsForHome(venture.id);

  return (
    <div className="sx-paper">
      {/* 1. The promise, shown rather than described */}
      <section className="sx-wrap" style={{ paddingTop: "clamp(1.5rem, 4vw, 3rem)", paddingBottom: "clamp(3rem, 6vw, 5rem)" }}>
        <div className="sx-hero-grid">
          <div className="sx-hero-copy">
            <p className="sx-label sx-mono so-animate-in">Made in Lacey, Washington</p>
            <h1 className="sx-h1 so-animate-in-delay" style={{ marginTop: "1.1rem" }}>
              Bring the idea.<br />Leave with the <span className="sx-em">real&nbsp;thing.</span>
            </h1>
            <p className="sx-lede so-animate-in-delay-2" style={{ marginTop: "1.4rem" }}>
              A photo, a memory, a line you can&apos;t stop thinking about. Sweet&apos;Oh turns it into a design, then into something you can hold, wear, drink from or give.
            </p>
            <div className="so-animate-in-delay-2" style={{ marginTop: "1.8rem", display: "flex", flexWrap: "wrap", gap: "0.9rem" }}>
              <Link href="/custom" className="so-btn-primary">Bring us an idea <ArrowRight size={17} aria-hidden /></Link>
              <Link href="/design" className="so-btn-ghost">Design it yourself</Link>
            </div>
          </div>
          <div className="sx-hero-scene">
            <TransformScene />
          </div>
        </div>
      </section>

      {/* 2. Five ways in */}
      <section className="sx-section sx-wrap" style={{ paddingTop: "clamp(2rem, 4vw, 3rem)" }}>
        <Reveal>
          <p className="sx-label sx-mono">Five ways in</p>
          <h2 className="sx-h2" style={{ marginTop: "0.9rem", maxWidth: "16ch" }}>Start wherever you are.</h2>
        </Reveal>
        <div className="sx-doors" style={{ marginTop: "2.2rem" }}>
          {DOOR_LIST.map((d, i) => (
            <Reveal key={d.cls} delay={i * 70} className={`sx-door-slot sx-door-slot--${d.cls}`}>
              <Link href={d.href} className={`sx-door sx-door--${d.cls}`}>
                <span className="sx-door-n">
                  <span className="sx-mono" style={{ opacity: 0.75 }}>{d.n}</span>
                  <span className="sx-door-arrow" aria-hidden><ArrowRight size={16} /></span>
                </span>
                <span>
                  <span className={d.cls === "idea" ? "sx-h2" : "sx-h3"} style={{ display: "block" }}>{d.title}</span>
                  <p>{d.body}</p>
                </span>
                <span className="sx-mono" style={{ fontSize: "0.7rem", opacity: 0.85 }}>{d.cta}</span>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      {/* 3. The range: one design, many objects */}
      <section className="sx-ink sx-section">
        <div className="sx-wrap">
          <Reveal>
            <p className="sx-label sx-mono">The same idea fits anything</p>
            <h2 className="sx-h2" style={{ marginTop: "0.9rem", maxWidth: "18ch" }}>One design. Every kind of object.</h2>
            <p className="sx-lede" style={{ marginTop: "1rem" }}>
              Products aren&apos;t what we sell. They&apos;re where your idea lands. Pick a design and watch it take the shape of each thing.
            </p>
          </Reveal>
          <Reveal delay={120}>
            <div style={{ marginTop: "2.2rem" }}><ObjectWall dark /></div>
          </Reveal>
          <Reveal delay={160}>
            <p style={{ marginTop: "2rem", display: "flex", flexWrap: "wrap", gap: "0.5rem 1.4rem", alignItems: "center" }}>
              <span style={{ color: "#cfc4ad", maxWidth: "40ch" }}>Apparel, tumblers, mugs, photo pieces, keepsakes, bags, engraving, and the things we haven&apos;t named yet.</span>
              <Link href="/make" className="sx-mono" style={{ color: "#f0c419", textDecoration: "underline", textUnderlineOffset: "5px" }}>See everything we make →</Link>
            </p>
          </Reveal>
        </div>
      </section>

      {/* 4. Already made */}
      <div className="sx-wrap">
        <FeaturedProducts ventureId={venture.id} items={featured} />
      </div>

      {/* 5. Place */}
      <section className="sx-section sx-wrap">
        <Reveal>
          <p className="sx-label sx-mono">Where it comes from</p>
          <div className="sx-place-head">
            <h2 className="sx-h2" style={{ marginTop: "0.9rem" }}>Made in <span className="sx-em">Lacey.</span><br />Rooted in Micronesia.</h2>
            <div>
              <p className="sx-lede">
                Every piece is made to order by a Micronesian-owned shop in Washington state. For family in the islands, for the diaspora across the mainland, and for anyone anywhere who is drawn to this work.
              </p>
              <ul className="sx-hello" style={{ marginTop: "1.4rem", padding: 0 }}>
                {ISLAND_GREETINGS.map((g) => (
                  <li key={g.greeting}><b>{g.greeting}</b><small>{g.place}</small></li>
                ))}
              </ul>
            </div>
          </div>
        </Reveal>
        <Reveal delay={120}>
          <div style={{ color: "var(--so-ink)", marginTop: "2.2rem" }}><GlobeLazy /></div>
        </Reveal>
      </section>

      {/* 6. Close */}
      <section className="sx-section sx-wrap" style={{ paddingTop: 0 }}>
        <Reveal>
          <div className="sx-close sx-card">
            <div>
              <p className="sx-label sx-mono">Your turn</p>
              <h2 className="sx-h2" style={{ marginTop: "0.8rem", maxWidth: "15ch" }}>What are you picturing?</h2>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.9rem" }}>
              <Link href="/custom" className="so-btn-primary">Bring us an idea <ArrowRight size={17} aria-hidden /></Link>
              <Link href="/design" className="so-btn-ghost">Open Studio</Link>
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
