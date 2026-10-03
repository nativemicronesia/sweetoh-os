import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { creatorSideOpen } from "@/lib/domains/creator/access";
import { Reveal } from "../components/reveal";
import { PrintedObject } from "../components/scenes/objects";
import { StudioList } from "./studio-list";
import { StudioDemo } from "../components/scenes/studio-demo";

export const metadata = {
  title: "Studio: design it yourself",
  description: "Sweet'Oh Studio is where ideas become designs: start from a photo, a few words or a blank page, and see it fitted to the real thing.",
};

const WAYS = [
  { n: "01", title: "From a photo", body: "Start with a picture that matters. Cut it out, crop it, make it a sticker, give it a border." },
  { n: "02", title: "From a few words", body: "Type the line, pick a style, bend it, outline it. Fonts and effects that look made, not templated." },
  { n: "03", title: "From a blank page", body: "Draw shapes, trace art into clean vector, combine and cut. A real design space, not a fill-in form." },
];

const REAL = [
  { title: "Drawn to real size", body: "Every surface shows its true print area, so what you see is what lands on the object." },
  { title: "Checked before it prints", body: "Studio warns you about low resolution and edges before anything is made." },
  { title: "One design, many objects", body: "Finish once. Send the same design to a tee, a mug, a tumbler, a sticker or an engraving." },
  { title: "A guide beside you", body: "Skink, our helper, explains each step in plain words and can suggest a direction when you're stuck." },
];

export default function DesignPage() {
  const open = creatorSideOpen();
  return (
    <div className="sx-paper">
      <section className="sx-wrap sx-pagehead sx-split-hero">
        <div>
        <p className="sx-label sx-mono so-animate-in">Studio</p>
        <h1 className="sx-h1 so-animate-in-delay" style={{ marginTop: "1rem", maxWidth: "13ch" }}>
          Where an idea becomes a <span className="sx-em">design.</span>
        </h1>
        <p className="sx-lede so-animate-in-delay-2" style={{ marginTop: "1.3rem" }}>
          Studio is a place to make, on its own or on the way to something real. Come to design a poster you&apos;ll never print, or a design you&apos;ll wear by Friday.
        </p>
        {open ? (
          <div className="so-animate-in-delay-2" style={{ marginTop: "1.8rem", display: "flex", flexWrap: "wrap", gap: "0.9rem" }}>
            <Link href="/studio/join" className="so-btn-primary">Open Studio <ArrowRight size={17} aria-hidden /></Link>
            <Link href="/custom" className="so-btn-ghost">Or have us design it</Link>
          </div>
        ) : (
          <div className="so-animate-in-delay-2" style={{ marginTop: "1.8rem" }}>
            <StudioList />
            <p style={{ marginTop: "1rem", fontSize: "0.92rem", color: "var(--so-cream-dim)", maxWidth: "46ch" }}>
              Studio is opening to everyone soon. Want something made now? Our team uses Studio for you:{" "}
              <Link href="/custom" className="so-link">bring us an idea</Link>.
            </p>
          </div>
        )}
        </div>
        <div className="sx-hero-objects" aria-hidden>
          <svg viewBox="0 0 240 240" className="sx-ho sx-ho-1"><PrintedObject kind="tee" art="plait" printed={1} color="#1f1b16" /></svg>
          <svg viewBox="0 0 240 240" className="sx-ho sx-ho-2"><PrintedObject kind="mug" art="bearings" printed={1} /></svg>
          <svg viewBox="0 0 240 240" className="sx-ho sx-ho-3"><PrintedObject kind="sticker" art="tide" printed={1} /></svg>
        </div>
      </section>

      <section className="sx-wrap" style={{ paddingBottom: "clamp(3rem, 7vw, 6rem)" }}>
        <Reveal><StudioDemo /></Reveal>
      </section>

      <section className="sx-section sx-wrap" style={{ paddingTop: 0 }}>
        <Reveal>
          <p className="sx-label sx-mono">Begin with whatever you have</p>
          <h2 className="sx-h2" style={{ marginTop: "0.9rem", maxWidth: "16ch" }}>Three ways to start.</h2>
        </Reveal>
        <div className="sx-grid3" style={{ marginTop: "2rem" }}>
          {WAYS.map((w, i) => (
            <Reveal key={w.n} delay={i * 80}>
              <div className="sx-card sx-feature" style={{ height: "100%" }}>
                <span className="sx-mono">{w.n}</span>
                <h3 className="sx-h3">{w.title}</h3>
                <p>{w.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="sx-ink sx-section">
        <div className="sx-wrap">
          <Reveal>
            <p className="sx-label sx-mono">Made for real things</p>
            <h2 className="sx-h2" style={{ marginTop: "0.9rem", maxWidth: "18ch" }}>A design tool that knows it&apos;s going to be an object.</h2>
          </Reveal>
          <div className="sx-grid2" style={{ marginTop: "2rem" }}>
            {REAL.map((r, i) => (
              <Reveal key={r.title} delay={i * 70}>
                <div style={{ borderTop: "1.5px solid #f4ecdd", paddingTop: "1rem" }}>
                  <h3 className="sx-h3" style={{ color: "#f4ecdd" }}>{r.title}</h3>
                  <p style={{ marginTop: "0.5rem", color: "#cfc4ad", lineHeight: 1.55 }}>{r.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="sx-section sx-wrap">
        <Reveal>
          <div className="sx-close sx-card">
            <div>
              <h2 className="sx-h2" style={{ maxWidth: "16ch" }}>Not sure where to start?</h2>
              <p className="sx-lede" style={{ marginTop: "0.8rem" }}>Bring us the photo or the thought. We&apos;ll open Studio for you.</p>
            </div>
            <Link href="/custom" className="so-btn-primary">Bring us an idea <ArrowRight size={17} aria-hidden /></Link>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
