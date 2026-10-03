"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Art, type ArtKind } from "./art";
import { OBJECTS, PrintedObject, type ObjectKind } from "./objects";

/**
 * The storefront's central picture: an idea becomes a design, the design is fitted to a real
 * surface, and the surface is printed. The same design then moves to other objects, because
 * that is what SweetOh does. Motion here is the explanation, not decoration.
 */

type Step = { art: ArtKind; object: ObjectKind; from: 0 | 2 };
const STEPS: Step[] = [
  { art: "bearings", object: "mug", from: 0 },
  { art: "bearings", object: "tee", from: 2 },
  { art: "bearings", object: "tumbler", from: 2 },
  { art: "tide", object: "plaque", from: 0 },
  { art: "tide", object: "sticker", from: 2 },
  { art: "plait", object: "tee", from: 0 },
  { art: "plait", object: "mug", from: 2 },
];
const STAGE_NAMES = ["Idea", "Design", "Object"] as const;
const MONO = 'ui-monospace, "SF Mono", Menlo, Consolas, monospace';

function IdeaCard({ w, h, art, stage, drawn }: { w: number; h: number; art: ArtKind; stage: number; drawn: number }) {
  const art2 = Math.max(60, Math.min(w - 56, h * 0.46, h - (h * 0.2 + 112) - 18));
  return (
    <g>
      <rect x="6" y="8" width={w} height={h} rx="6" fill="#16120d" opacity=".14" />
      <rect x="0" y="0" width={w} height={h} rx="6" fill="#fbf6ea" stroke="#16120d" strokeOpacity=".5" strokeWidth="1.5" />
      <rect x={w / 2 - 34} y="-9" width="68" height="18" fill="#f0c419" opacity=".85" transform={`rotate(-3 ${w / 2} 0)`} />
      <text x="18" y="30" fontFamily={MONO} fontSize="11" fontWeight="700" letterSpacing="2" fill="#8a5f10">01 · IDEA</text>
      <g transform="translate(18 44)">
        <rect width={w - 36} height={h * 0.2} rx="3" fill="#d8ccb4" />
        <g fill="#16120d" opacity=".12">{Array.from({ length: 16 }, (_, i) => <circle key={i} cx={10 + (i % 8) * ((w - 56) / 8)} cy={10 + Math.floor(i / 8) * 14} r={2 + (i % 3) * 1.2} />)}</g>
        <text x="10" y={h * 0.2 - 8} fontFamily={MONO} fontSize="9" fill="#5f5443">a photo, a memory</text>
      </g>
      <g fontFamily={MONO} fontSize="10.5" fill="#16120d">
        <text x="18" y={h * 0.2 + 74}>for mum&apos;s 60th.</text>
        <text x="18" y={h * 0.2 + 90} fill="#5f5443">something that feels like home</text>
      </g>
      <g transform={`translate(${(w - art2) / 2} ${h - art2 - 18})`}>
        <g className="sx-sketch"><Art kind={art} mode="sketch" size={art2} drawn={drawn} /></g>
        <g style={{ opacity: stage >= 1 ? 1 : 0, transition: "opacity .9s ease" }}><Art kind={art} mode="print" size={art2} /></g>
      </g>
    </g>
  );
}

function StudioWindow({ w, h, art, stage }: { w: number; h: number; art: ArtKind; stage: number }) {
  const canvasW = w - 64;
  const size = Math.min(canvasW - 30, h * 0.5);
  const cx = 52 + canvasW / 2 - size / 2;
  const cy = 62 + (h - 120) / 2 - size / 2 + 8;
  return (
    <g>
      <rect x="6" y="8" width={w} height={h} rx="10" fill="#16120d" opacity=".16" />
      <rect x="0" y="0" width={w} height={h} rx="10" fill="#fbf6ea" stroke="#16120d" strokeWidth="1.5" />
      <path d={`M0 36 H${w}`} stroke="#16120d" strokeOpacity=".25" />
      {[0, 1, 2].map((i) => <circle key={i} cx={18 + i * 14} cy="18" r="4" fill={["#d93d22", "#f0c419", "#1b8ea6"][i]} />)}
      <text x={w - 18} y="22" textAnchor="end" fontFamily={MONO} fontSize="10" fontWeight="700" letterSpacing="2" fill="#8a5f10">02 · STUDIO</text>
      <g stroke="#16120d" strokeOpacity=".5" fill="none" strokeWidth="1.4">
        <rect x="12" y="52" width="26" height="26" rx="5" /><path d="M20 70 l5 -6 l5 6" />
        <rect x="12" y="88" width="26" height="26" rx="5" /><path d="M20 98 h10 M25 98 v12" />
        <rect x="12" y="124" width="26" height="26" rx="5" /><circle cx="25" cy="137" r="6" />
      </g>
      <rect x="52" y="52" width={canvasW} height={h - 118} rx="4" fill="#fff" stroke="#16120d" strokeOpacity=".2" />
      <g style={{ transformBox: "fill-box", transformOrigin: "center", transform: stage >= 2 ? "translate(0,0) scale(1)" : "translate(-120px, 40px) scale(.55)", opacity: stage >= 2 ? 1 : 0, transition: "transform .9s cubic-bezier(.22,1,.36,1), opacity .5s ease" }}>
        <g transform={`translate(${cx} ${cy})`}><Art kind={art} mode="print" size={size} /></g>
        <g fill="#fff" stroke="#d93d22" strokeWidth="1.5" style={{ opacity: stage >= 2 ? 1 : 0, transition: "opacity .4s ease .7s" }}>
          <rect x={cx - 4} y={cy - 4} width={size + 8} height={size + 8} fill="none" strokeDasharray="4 3" />
          {[[cx - 4, cy - 4], [cx + size + 4, cy - 4], [cx - 4, cy + size + 4], [cx + size + 4, cy + size + 4]].map(([x, y], i) => <rect key={i} x={x - 4} y={y - 4} width="8" height="8" />)}
        </g>
      </g>
      <g transform={`translate(12 ${h - 50})`} fontFamily={MONO} fontSize="10" fill="#5f5443">
        <rect width={w - 24} height="34" rx="6" fill="#ece2cd" />
        <text x="12" y="21">fit to real surface</text>
        <g style={{ opacity: stage >= 2 ? 1 : 0, transition: "opacity .5s ease .9s" }}>
          <rect x={w - 118} y="8" width="94" height="18" rx="9" fill="#16120d" /><text x={w - 71} y="21" textAnchor="middle" fill="#f4ecdd" fontSize="9.5">checked ✓</text>
        </g>
      </g>
    </g>
  );
}

function Link2({ d, active }: { d: string; active: boolean }) {
  return <path d={d} fill="none" stroke="#16120d" strokeWidth="1.6" strokeLinecap="round" strokeDasharray="2 7" className={active ? "sx-flow" : undefined} opacity={active ? 0.9 : 0.35} />;
}

function Station({ n, label, active, onSelect, x, y }: { n: number; label: string; active: boolean; onSelect: () => void; x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`} style={{ cursor: "pointer" }} onClick={onSelect}>
      <rect x="-6" y="-16" width="132" height="30" fill="transparent" />
      <text fontFamily={MONO} fontSize="11" fontWeight="700" letterSpacing="2" fill={active ? "#16120d" : "#6f6452"}>{`0${n} ${label.toUpperCase()}`}</text>
      <path d="M0 8 H116" stroke="#d93d22" strokeWidth="2.5" strokeLinecap="round" style={{ transformOrigin: "0 8px", transform: active ? "scaleX(1)" : "scaleX(0)", transition: "transform .5s var(--so-ease)" }} />
    </g>
  );
}

export function TransformScene({ className }: { className?: string }) {
  const root = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState(0);
  const [stage, setStage] = useState(3);
  const [drawn, setDrawn] = useState(1);
  const [manual, setManual] = useState(false);
  const [visible, setVisible] = useState(false);
  const [reduced, setReduced] = useState(true);
  const { art, object } = STEPS[step];

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(media.matches);
    sync();
    media.addEventListener("change", sync);
    const io = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.35 });
    if (root.current) io.observe(root.current);
    return () => { media.removeEventListener("change", sync); io.disconnect(); };
  }, []);

  const playing = visible && !manual && !reduced;

  useEffect(() => {
    if (!playing) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const at = (ms: number, fn: () => void) => timers.push(setTimeout(fn, ms));
    const { from } = STEPS[step];
    // Every run starts from its beginning: an idea being drawn, or a design arriving at a new surface.
    if (from === 0) { at(0, () => { setStage(0); setDrawn(0); }); at(80, () => setDrawn(1)); at(2100, () => setStage(1)); at(3400, () => setStage(2)); at(4900, () => setStage(3)); at(8600, () => setStep((s) => (s + 1) % STEPS.length)); }
    else { at(0, () => { setStage(2); setDrawn(1); }); at(900, () => setStage(3)); at(5200, () => setStep((s) => (s + 1) % STEPS.length)); }
    return () => timers.forEach(clearTimeout);
  }, [playing, step]);

  function jump(to: number) {
    setManual(true);
    setDrawn(1);
    setStage(to === 0 ? 0 : to === 1 ? 2 : 3);
  }

  const shown = stage >= 3 ? 2 : stage >= 2 ? 1 : 0;
  const printed = stage >= 3 ? 1 : 0;
  const o = OBJECTS[object];

  const caption: ReactNode = (
    <p className="sx-scene-caption" aria-live="polite">
      <span className="sx-mono">{o.label}</span> · {stage >= 3 ? `the same design, fitted to the surface — ${o.note}` : stage >= 2 ? "checked against the real print area" : stage >= 1 ? "the idea takes shape" : "an idea, drawn out"}
    </p>
  );

  return (
    <div ref={root} className={className} onMouseEnter={() => setManual(true)} onMouseLeave={() => setManual(false)} onFocus={() => setManual(true)} onBlur={() => setManual(false)}>
      <div role="img" aria-label="A rough idea becomes a design in Studio, then a real printed object, then the same design is fitted to other objects." className="sx-scene">
        {/* Wide: the three stations side by side */}
        <svg viewBox="0 0 1000 530" className="sx-scene-wide" aria-hidden>
          <g transform="translate(28 70) rotate(-3 135 190)"><IdeaCard w={270} h={380} art={art} stage={stage} drawn={drawn} /></g>
          <Link2 d="M312 270 C 336 250, 346 250, 372 262" active={stage >= 1} />
          <g transform="translate(372 36)"><StudioWindow w={290} h={440} art={art} stage={stage} /></g>
          <Link2 d="M668 262 C 692 250, 704 250, 730 258" active={stage >= 2} />
          <g transform="translate(722 110) scale(1.12)"><PrintedObject key={object} kind={object} art={art} printed={printed} /></g>
          <Station n={1} label="Idea" active={shown === 0} onSelect={() => jump(0)} x={44} y={506} />
          <Station n={2} label="Design" active={shown === 1} onSelect={() => jump(1)} x={388} y={506} />
          <Station n={3} label="Object" active={shown === 2} onSelect={() => jump(2)} x={738} y={506} />
        </svg>
        {/* Tall: the same story, stacked, for phones */}
        <svg viewBox="0 0 400 640" className="sx-scene-tall" aria-hidden>
          <g transform="translate(14 14) rotate(-2 105 120)"><IdeaCard w={212} h={268} art={art} stage={stage} drawn={drawn} /></g>
          <Link2 d="M150 292 C 160 318, 190 322, 214 330" active={stage >= 1} />
          <g transform="translate(168 214)"><StudioWindow w={216} h={236} art={art} stage={stage} /></g>
          <Link2 d="M270 452 C 270 472, 250 480, 214 494" active={stage >= 2} />
          <g transform="translate(70 400) scale(.88)"><PrintedObject key={`t-${object}`} kind={object} art={art} printed={printed} /></g>
          <Station n={1} label="Idea" active={shown === 0} onSelect={() => jump(0)} x={20} y={620} />
          <Station n={2} label="Design" active={shown === 1} onSelect={() => jump(1)} x={146} y={620} />
          <Station n={3} label="Object" active={shown === 2} onSelect={() => jump(2)} x={272} y={620} />
        </svg>
      </div>
      {caption}
      <div className="sx-scene-stages" role="group" aria-label="Jump to a step">
        {STAGE_NAMES.map((name, i) => (
          <button key={name} type="button" className="sx-chip" aria-pressed={shown === i} onClick={() => jump(i)}>{name}</button>
        ))}
        <button type="button" className="sx-chip sx-chip-ghost" onClick={() => { setManual(false); setStep((s) => (s + 1) % STEPS.length); }}>Show another</button>
      </div>
    </div>
  );
}
