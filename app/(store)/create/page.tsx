import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRight,
  Brain,
  Check,
  Download,
  Layers,
  Lightbulb,
  MessageCircle,
  Palette,
  Printer,
  Ruler,
  Search,
  Sparkles,
  Store,
  Wand2,
} from "lucide-react";
import { listBestsellerBlueprints, listPrintifyBlueprints } from "@/lib/integrations/printify/catalog";
import { PLANS, formatUsd } from "@/lib/domains/creator/plans";
import { redirect } from "next/navigation";
import { creatorSideOpen, creatorSignupsOpen } from "@/lib/domains/creator/access";
import { MascotCharacter } from "../components/mascot-character";
import "@/app/(creator)/studio/creator.css";
import "./create.css";

export const metadata: Metadata = {
  title: "Create with Sweet'Oh — start your print-on-demand brand",
  description:
    "Design real products, learn print-on-demand with Skink — Sweet'Oh AI — and send them to your own Printify store. Built by islanders, open to everyone. Start free.",
  openGraph: {
    title: "Create with Sweet'Oh",
    description: "The easier way to start a print-on-demand brand — with an AI that teaches you.",
  },
};

const STEPS = [
  { icon: MessageCircle, title: "Tell Skink your idea", text: "A brand, a niche, a vibe. Skink helps you shape it — and remembers it." },
  { icon: Palette, title: "Pick a real product", text: "Tees, hoodies, mugs, totes, hats and hundreds more from the Printify catalog." },
  { icon: Wand2, title: "Design it in the Studio", text: "AI designs and patterns, your own art, text and layers — print-ready at 300 DPI." },
  { icon: Store, title: "Sell it your way", text: "Send it to your own Printify store, or have the Sweet'Oh shop print it for you." },
];

const STUDIO = [
  { icon: Sparkles, title: "AI designs & seamless patterns", text: "Describe it, get original artwork. Edit it with words: “make it navy”, “add plumeria”." },
  { icon: Layers, title: "Layers, text & shapes", text: "Real design tools — fonts, crop, flip, opacity, background removal, undo and redo." },
  { icon: Ruler, title: "Print areas you control", text: "Front, back, sleeves, a small chest badge or the whole surface — in real inches." },
  { icon: Download, title: "Print-ready files", text: "Transparent 300 DPI PNGs for every print area. They're yours to use anywhere." },
];

const FAQ = [
  ["Do I need to know anything about print-on-demand?", "No. Skink teaches you as you go — what to make, how Printify works, how to price, and where to sell. Ask anything, any time."],
  ["Who owns my designs and my store?", "You do. Sweet'Oh sends products into your own Printify account. Your customers, sales and payouts are yours."],
  ["Where can I sell?", "Anywhere Printify connects: Etsy, Shopify, TikTok Shop, eBay, Wix, Squarespace and more. Sweet'Oh-hosted stores are coming next."],
  ["What are credits?", "Credits are Skink's AI capacity. Chatting uses almost none; AI images, deep research and the most capable models use more. Designing by hand, saving and exporting never cost credits."],
  ["Which AI does Skink use?", "The best one for each job — OpenAI, Anthropic and Google — and your own subscriptions when those suit the work better. You never have to pick a model; Pro lets you choose how deeply Skink thinks."],
  ["I already pay for ChatGPT, Canva and Printify. Is this a replacement?", "No. Skink uses them. Tell him what you have and he'll prepare the exact prompt and your brand context for your tool, then carry on from the result — without spending your Sweet'Oh credits."],
  ["What does the free trial cost?", "Nothing for 3 months. We take a card up front so nothing breaks when the trial ends, and you can cancel any time before the first charge."],
  ["Can Sweet'Oh print my order instead?", "On Creator and Pro, yes — send a request from the Studio and the Sweet'Oh shop in Lacey, WA will quote it when it has capacity. Great for events, family reunions, churches and schools."],
];

export default async function CreateWithSweetOhPage() {
  // Launch: the shop only. Custom orders go through /custom until the creator side opens.
  if (!creatorSideOpen()) redirect("/custom");
  const [picks, all] = await Promise.all([listBestsellerBlueprints().catch(() => []), listPrintifyBlueprints().catch(() => [])]);
  const open = creatorSignupsOpen();
  const joinLabel = open ? "Start free" : "Join the waitlist";
  const gallery = picks.filter((b: (typeof picks)[number]) => b.images[0]).slice(0, 6);
  const count = all.length ? `${Math.floor(all.length / 100) * 100}+` : "Hundreds of";

  return (
    <div className="cs cw">
      {/* Hero */}
      <section className="cw-hero">
        <div className="cw-wrap cw-hero-grid">
          <div>
            <p className="cs-eyebrow">Create with Sweet&apos;Oh</p>
            <h1 className="cw-title">Start your print-on-demand brand — with an AI that teaches you.</h1>
            <p className="cw-lead">
              Meet <strong>Skink</strong> — the Sweet&apos;Oh AI agent for print-on-demand. He teaches you the business, researches your niche, designs with you in the Studio, and helps you set up your own store. He works with what you already pay for, too.
            </p>
            <div className="cs-row" style={{ marginTop: 26 }}>
              <Link href="/studio/join" className="cs-btn cs-btn-primary cs-btn-lg">{joinLabel} <ArrowRight size={18} /></Link>
              <Link href="#how" className="cs-btn cs-btn-ghost cs-btn-lg">See how it works</Link>
            </div>
            <p className="cs-muted" style={{ fontSize: 13, marginTop: 14 }}>
              {open ? "Free forever plan · no card needed · built by islanders, open to everyone" : "Opening soon · built by islanders, open to everyone"}
            </p>
          </div>
          <div className="cw-collage" aria-hidden>
            {gallery.map((b: (typeof gallery)[number], i: number) => (
              <div key={b.id} className={`cw-tile cw-tile-${i}`}><img src={b.images[0]} alt="" /></div>
            ))}
            <div className="cw-chat">
              <div className="cw-chat-row"><MascotCharacter size={30} /><p>Island florals are huge with the diaspora. Want 5 tee ideas for your brand?</p></div>
              <div className="cw-chat-row cw-chat-me"><p>Yes! Chuukese mwaramwar vibes 🌺</p></div>
            </div>
          </div>
        </div>
      </section>

      {/* Proof strip */}
      <section className="cw-strip">
        <div className="cw-wrap cw-strip-grid">
          <div><strong>{count}</strong><span>products to design</span></div>
          <div><strong>3</strong><span>top AI labs behind Skink</span></div>
          <div><strong>Your</strong><span>store, customers &amp; money</span></div>
          <div><strong>300 DPI</strong><span>print-ready files</span></div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="cw-section">
        <div className="cw-wrap">
          <p className="cs-eyebrow">How it works</p>
          <h2 className="cw-h2">From idea to product in an afternoon.</h2>
          <div className="cw-steps">
            {STEPS.map((s, i) => (
              <div key={s.title} className="cw-step">
                <span className="cw-step-n">{i + 1}</span>
                <s.icon size={26} />
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Studio */}
      <section className="cw-section cw-studio">
        <div className="cw-wrap cw-split">
          <div>
            <p className="cs-eyebrow" style={{ color: "var(--cs-lime)" }}>The Studio</p>
            <h2 className="cw-h2" style={{ color: "white" }}>A real design studio. Not a template.</h2>
            <p className="cw-lead" style={{ color: "#cfe6c9" }}>Everything you need to make products people want — the simplicity of Printify with the tools of a design app.</p>
            <div className="cw-feature-grid">
              {STUDIO.map((f) => (
                <div key={f.title} className="cw-feature">
                  <f.icon size={22} />
                  <strong>{f.title}</strong>
                  <p>{f.text}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="cw-mock" aria-hidden>
            <div className="cw-mock-bar"><span /><span /><span /><b>Sweet&apos;Oh Studio</b></div>
            <div className="cw-mock-body">
              <div className="cw-mock-rail">{[Sparkles, Layers, Palette, Lightbulb].map((I, i) => <I key={i} size={16} />)}</div>
              <div className="cw-mock-canvas">{gallery[0] && <img src={gallery[0].images[0]} alt="" />}<div className="cw-mock-area">Your design</div></div>
            </div>
          </div>
        </div>
      </section>

      {/* Skink */}
      <section className="cw-section">
        <div className="cw-wrap cw-split cw-split-rev">
          <div className="cw-skink-card">
            <MascotCharacter size={96} />
            <div className="cw-skink-lines">
              <div><Brain size={16} /> Remembers your brand, goals &amp; decisions</div>
              <div><Search size={16} /> Researches niches &amp; trends</div>
              <div><Lightbulb size={16} /> Thinks through pricing &amp; strategy</div>
              <div><MessageCircle size={16} /> Explains every step in plain words</div>
            </div>
          </div>
          <div>
            <p className="cs-eyebrow">Meet Skink</p>
            <h2 className="cw-h2">Your POD teacher, researcher and creative director.</h2>
            <p className="cw-lead">
              Skink is Sweet&apos;Oh&apos;s green tree skink — and the AI agent inside your Studio. It teaches you print-on-demand from zero, finds what&apos;s selling, helps you price for profit and writes your listings. It keeps a private memory of your brand, so every conversation picks up where you left off. You can see and edit everything it remembers.
            </p>
            <p className="cs-muted" style={{ fontSize: 14 }}>Powered by OpenAI, Anthropic and Google — Skink picks the right model for each job.</p>
          </div>
        </div>
      </section>

      {/* Use what you already pay for */}
      <section className="cw-section cw-soft">
        <div className="cw-wrap">
          <p className="cs-eyebrow">Works with what you have</p>
          <h2 className="cw-h2">Already paying for ChatGPT, Canva or Printify? Good.</h2>
          <p className="cw-lead">
            Sweet&apos;Oh isn&apos;t here to replace your tools. Tell Skink what you already have and he&apos;ll use it: he writes the exact prompt, adds everything he knows about your brand, and hands it to your own ChatGPT, Claude, Gemini or Canva. You run it there, bring the answer back, and he keeps going — no Sweet&apos;Oh credits spent.
          </p>
          <div className="cw-two">
            <div className="cs-card cs-pad">
              <Sparkles size={26} color="var(--cs-green)" />
              <h3 className="cw-h3">Your subscriptions do more</h3>
              <p>Niche research, listings, design briefs, launch posts — prepared for your tool, in your brand&apos;s voice.</p>
            </div>
            <div className="cs-card cs-pad">
              <Layers size={26} color="var(--cs-green)" />
              <h3 className="cw-h3">Your credits last longer</h3>
              <p>Sweet&apos;Oh credits go to what only Sweet&apos;Oh can do: your designs, your products and your print files.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Your store */}
      <section className="cw-section cw-soft">
        <div className="cw-wrap">
          <p className="cs-eyebrow">Sell it your way</p>
          <h2 className="cw-h2">Your store. Your customers. Your money.</h2>
          <div className="cw-two">
            <div className="cs-card cs-pad">
              <Store size={26} color="var(--cs-green)" />
              <h3 className="cw-h3">Send it to your Printify store</h3>
              <p>Connect your own Printify account once. Every design you finish goes straight into your store — then out to Etsy, Shopify, TikTok Shop and more. Printify prints and ships each order; you keep the profit.</p>
            </div>
            <div className="cs-card cs-pad">
              <Printer size={26} color="var(--cs-green)" />
              <h3 className="cw-h3">Or have Sweet&apos;Oh print it</h3>
              <p>Need shirts for a reunion, church, team or your first inventory? Send a request from the Studio and the Sweet&apos;Oh shop in Lacey, Washington quotes it. You only pay if you accept.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Islanders */}
      <section className="cw-section">
        <div className="cw-wrap cw-island">
          <MascotCharacter size={72} />
          <h2 className="cw-h2" style={{ maxWidth: "20ch", margin: "16px auto 12px" }}>Built for islanders. Open to everyone.</h2>
          <p className="cw-lead" style={{ margin: "0 auto", maxWidth: "60ch" }}>
            Everyone else is already running print-on-demand stores. Sweet&apos;Oh is a Micronesian-owned company making it easier for our people — in Guam, the FSM, Palau, the Marshalls, the CNMI and across the diaspora — to build brands that carry our culture. And anyone with an idea is welcome.
          </p>
        </div>
      </section>

      {/* Plans */}
      <section id="plans" className="cw-section cw-soft">
        <div className="cw-wrap">
          <p className="cs-eyebrow">Plans</p>
          <h2 className="cw-h2">Start free. Grow when you&apos;re ready.</h2>
          <div className="cs-founding" style={{ margin: "18px 0 22px" }}>
            <div>
              <strong>{open ? "Creator is free for 3 months" : "Creator will be free for 3 months"}</strong>
              <p className="cs-muted" style={{ margin: "4px 0 0", fontSize: 14 }}>
                Card up front, nothing charged until month four, cancel any time.
              </p>
            </div>
            <Link href="/studio/join?next=/studio/plans" className="cs-btn cs-btn-coral">{open ? "Start 3 months free" : "Join the waitlist"}</Link>
          </div>
          <div className="cs-plans">
            {(["free", "creator", "pro"] as const).map((id) => {
              const p = PLANS[id];
              return (
                <article key={id} className={`cs-plan${id === "creator" ? " featured" : ""}`}>
                  {id === "creator" && <span className="cs-ribbon">Most popular</span>}
                  <h3 className="cs-h2">{p.name}</h3>
                  <p className="cs-muted" style={{ margin: "4px 0 0", fontSize: 14 }}>{p.tagline}</p>
                  <div className="cs-plan-price">{p.monthlyCents ? formatUsd(p.monthlyCents) : "$0"}<small> /month</small></div>
                  {p.trialDays ? <div style={{ fontSize: 13, color: "var(--cs-coral)", fontWeight: 600 }}>free for 3 months, then {formatUsd(p.monthlyCents)}</div> : p.yearlyCents > 0 ? <div style={{ fontSize: 13, color: "var(--cs-coral)", fontWeight: 600 }}>or {formatUsd(p.yearlyCents)}/year — 6 months free</div> : null}
                  <ul>{p.features.map((f) => <li key={f}><Check size={16} /> {f}</li>)}</ul>
                  <div className="cs-plan-actions">
                    <Link href={id === "free" ? "/studio/join" : "/studio/join?next=/studio/plans"} className={`cs-btn ${id === "creator" ? "cs-btn-primary" : "cs-btn-ghost"}`}>
                      {!open ? "Join the waitlist" : id === "free" ? "Start free" : id === "creator" ? "Start 3 months free" : `Choose ${p.name}`}
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="cw-section">
        <div className="cw-wrap" style={{ maxWidth: 820 }}>
          <h2 className="cw-h2">Questions</h2>
          <div className="cw-faq">
            {FAQ.map(([q, a]) => (
              <details key={q}>
                <summary>{q}</summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="cw-section">
        <div className="cw-wrap">
          <div className="cs-hero" style={{ textAlign: "center", padding: "56px 24px" }}>
            <MascotCharacter size={80} />
            <h2 className="cw-h2" style={{ color: "white", margin: "14px auto 10px", maxWidth: "18ch" }}>Your brand starts with one design.</h2>
            <p style={{ margin: "0 auto 24px", maxWidth: "46ch" }}>Make it today. Skink will show you the way.</p>
            <Link href="/studio/join" className="cs-btn cs-btn-lime cs-btn-lg">{open ? "Create my free studio" : "Join the waitlist"} <ArrowRight size={18} /></Link>
          </div>
        </div>
      </section>
    </div>
  );
}
