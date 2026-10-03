import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Reveal } from "../components/reveal";
import { ObjectWall } from "../components/scenes/object-wall";

export const metadata = {
  title: "What we make",
  description: "Apparel, tumblers, mugs, photo pieces, keepsakes, bags, engraving and more: one idea can become many kinds of real things.",
};

const RANGE = [
  { title: "Wear it", items: "Tees, hoodies, little-kid sizes, team and family sets", note: "Printed to order, sized for everyone." },
  { title: "Drink from it", items: "Mugs and tumblers", note: "A design that wraps all the way round." },
  { title: "Keep it", items: "Photo pieces, keepsakes, bags", note: "The things people hold onto for years." },
  { title: "Make it permanent", items: "Engraving", note: "Burned into wood, for the pieces that last." },
  { title: "Stick it anywhere", items: "Stickers, cut to their own edge", note: "Small, loud, and everywhere." },
  { title: "Something else", items: "Tell us the object", note: "If you can picture it, ask. We'll say honestly whether we can." },
];

export default function MakePage() {
  return (
    <div className="sx-paper">
      <section className="sx-wrap sx-pagehead">
        <p className="sx-label sx-mono so-animate-in">What we make</p>
        <h1 className="sx-h1 so-animate-in-delay" style={{ marginTop: "1rem", maxWidth: "14ch" }}>
          Your idea, <span className="sx-em">in whatever shape</span> it needs.
        </h1>
        <p className="sx-lede so-animate-in-delay-2" style={{ marginTop: "1.3rem" }}>
          We don&apos;t start with a product catalog. We start with what you want to say, then find the object that carries it best.
        </p>
      </section>

      <section className="sx-wrap" style={{ paddingBottom: "clamp(3rem, 7vw, 6rem)" }}>
        <Reveal>
          <div className="sx-card" style={{ padding: "clamp(1.2rem, 3vw, 2.2rem)", background: "var(--so-ink)", color: "#f4ecdd" }}>
            <ObjectWall dark />
          </div>
        </Reveal>
      </section>

      <section className="sx-wrap" style={{ paddingBottom: "clamp(3rem, 7vw, 6rem)" }}>
        <div className="sx-grid3">
          {RANGE.map((r, i) => (
            <Reveal key={r.title} delay={(i % 3) * 70}>
              <div className="sx-card sx-feature" style={{ height: "100%" }}>
                <span className="sx-mono">{String(i + 1).padStart(2, "0")}</span>
                <h3 className="sx-h3">{r.title}</h3>
                <p style={{ color: "var(--so-cream)", fontWeight: 600 }}>{r.items}</p>
                <p>{r.note}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="sx-section sx-wrap" style={{ paddingTop: 0 }}>
        <Reveal>
          <div className="sx-close sx-card">
            <h2 className="sx-h2" style={{ maxWidth: "16ch" }}>Picture it. Then ask.</h2>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.9rem" }}>
              <Link href="/custom" className="so-btn-primary">Bring us an idea <ArrowRight size={17} aria-hidden /></Link>
              <Link href="/collections" className="so-btn-ghost">Shop what&apos;s ready</Link>
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
