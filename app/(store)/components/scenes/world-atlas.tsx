"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { ATLAS, ATLAS_SIZE } from "./atlas-data";

/**
 * A slow tour of the world, drawn from real coastlines (Natural Earth). It starts at the home islands
 * and moves outward, because the people who care about this work live everywhere. The Micronesian
 * nations stay vermilion in every view; the dashed line is the true great-circle path from Lacey.
 */
export function WorldAtlas() {
  const root = useRef<HTMLElement>(null);
  const [i, setI] = useState(0);
  const [visible, setVisible] = useState(false);
  const [held, setHeld] = useState(false);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(true);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(media.matches);
    sync();
    media.addEventListener("change", sync);
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.3 });
    if (root.current) io.observe(root.current);
    return () => { media.removeEventListener("change", sync); io.disconnect(); };
  }, []);

  const playing = visible && !held && !paused && !reduced;
  useEffect(() => {
    if (!playing) return;
    const t = setTimeout(() => setI((n) => (n + 1) % ATLAS.length), 6500);
    return () => clearTimeout(t);
  }, [playing, i]);

  const view = ATLAS[i];
  return (
    <figure ref={root} style={{ margin: 0 }} onMouseEnter={() => setHeld(true)} onMouseLeave={() => setHeld(false)} onFocus={() => setHeld(true)} onBlur={() => setHeld(false)}>
      <div className="sx-atlas" role="img" aria-label={`Map of ${view.name}, drawn from real coastlines. ${view.note}`}>
        {ATLAS.map((v, n) => (
          <svg key={v.id} viewBox={`0 0 ${ATLAS_SIZE.width} ${ATLAS_SIZE.height}`} aria-hidden data-on={n === i ? "true" : "false"} className="sx-atlas-view">
            <rect width={ATLAS_SIZE.width} height={ATLAS_SIZE.height} fill="color-mix(in srgb, #1b8ea6 10%, var(--so-black))" />
            <path d={v.grat} fill="none" stroke="currentColor" strokeOpacity=".15" strokeWidth="1" />
            <path d={v.land} fill="#e9dcc0" stroke="currentColor" strokeOpacity=".6" strokeWidth="1" strokeLinejoin="round" />
            {v.micro && <path d={v.micro} fill="none" stroke="#d93d22" strokeOpacity=".28" strokeWidth={v.halo} strokeLinejoin="round" />}
            {v.micro && <path d={v.micro} fill="#d93d22" stroke="#d93d22" strokeWidth={v.micW} strokeLinejoin="round" />}
            <path d={v.arc} fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="3 9" strokeLinecap="round" />
            {v.lacey && (
              <g>
                <circle cx={v.lacey[0]} cy={v.lacey[1]} r="11" fill="#f0c419" stroke="currentColor" strokeWidth="2.2" />
                <circle cx={v.lacey[0]} cy={v.lacey[1]} r="3.6" fill="currentColor" />
                <text x={v.lacey[0] + (v.lacey[0] > 800 ? -18 : 18)} y={v.lacey[1] + 5} textAnchor={v.lacey[0] > 800 ? "end" : "start"} className="sx-map-place" fill="currentColor">Lacey, Washington</text>
              </g>
            )}
          </svg>
        ))}
        <div className="sx-atlas-tag">
          <span className="sx-mono" style={{ color: "var(--so-gold)" }}>{view.kicker}</span>
          <b>{view.name}</b>
        </div>
      </div>
      <figcaption className="sx-atlas-foot">
        <p aria-live="polite">{view.note}</p>
        <div className="sx-atlas-ctl" role="group" aria-label="Choose a region">
          {ATLAS.map((v, n) => (
            <button key={v.id} type="button" className="sx-dot" aria-pressed={n === i} aria-label={v.name} onClick={() => { setI(n); setPaused(true); }} />
          ))}
          <button type="button" className="sx-chip sx-chip-ghost" style={{ marginLeft: "0.4rem" }} onClick={() => setPaused((p) => !p)} aria-label={paused || reduced ? "Play the tour" : "Pause the tour"}>
            {paused || reduced ? <Play size={14} aria-hidden /> : <Pause size={14} aria-hidden />}
          </button>
        </div>
      </figcaption>
    </figure>
  );
}
