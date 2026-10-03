"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { geoGraticule10, geoOrthographic, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import type { Topology } from "topojson-specification";
import land110 from "world-atlas/land-110m.json";
import micro from "./micronesia-geo.json";

/**
 * A real globe: coastlines from Natural Earth, every Micronesian nation in vermilion, and the true
 * great-circle routes out from Lacey, Washington. It turns by itself from region to region and can be
 * dragged by hand. Drawn on a canvas so it stays smooth on phones.
 */

type View = { id: string; name: string; kicker: string; note: string; lon: number; lat: number; zoom: number };
const VIEWS: View[] = [
  { id: "micronesia", name: "Micronesia", kicker: "Home islands", note: "Palau, the four states of the FSM, Guam and the Marianas, the Marshall Islands, Nauru and Kiribati.", lon: 153, lat: 9, zoom: 5.2 },
  { id: "pacific", name: "The Pacific", kicker: "The wide ocean", note: "Hawaii, the islands, and the long way home to the Pacific Northwest.", lon: -178, lat: 16, zoom: 1.55 },
  { id: "north-america", name: "North America", kicker: "Where it's made", note: "Lacey, Washington: every piece is made here, then sent across the continent.", lon: -104, lat: 42, zoom: 1.9 },
  { id: "asia", name: "Asia and Australasia", kicker: "Across the water", note: "Family in the Philippines, Japan, Australia, New Zealand and everywhere between.", lon: 115, lat: 12, zoom: 1.7 },
  { id: "europe", name: "Europe and the Middle East", kicker: "Further out", note: "Friends, military families and curious people far from any island.", lon: 22, lat: 42, zoom: 2.3 },
  { id: "africa", name: "Africa", kicker: "Further still", note: "People who found the work and wanted a piece of it.", lon: 20, lat: 3, zoom: 1.7 },
  { id: "south-america", name: "South America and the Caribbean", kicker: "Everywhere else", note: "Anyone who wants to hold their idea in their hands.", lon: -62, lat: -16, zoom: 1.8 },
];

const LACEY: [number, number] = [-122.8, 47.0];
const ROUTES: [number, number][] = [[144.8, 13.45], [158.2, 6.9], [171.4, 7.1], [134.5, 7.5], [-157.9, 21.3], [151.8, 7.4]];
const PLACES: { name: string; lon: number; lat: number; dx: number; dy: number }[] = [
  { name: "Palau", lon: 134.5, lat: 7.5, dx: -8, dy: -10 }, { name: "Yap", lon: 138.1, lat: 9.5, dx: 0, dy: -11 },
  { name: "Guam", lon: 144.8, lat: 13.45, dx: 0, dy: 20 }, { name: "Saipan", lon: 145.7, lat: 15.2, dx: 14, dy: -6 },
  { name: "Chuuk", lon: 151.8, lat: 7.4, dx: 0, dy: 20 }, { name: "Pohnpei", lon: 158.2, lat: 6.9, dx: 0, dy: -12 },
  { name: "Kosrae", lon: 163.0, lat: 5.3, dx: 0, dy: 20 }, { name: "Majuro", lon: 171.4, lat: 7.1, dx: 0, dy: -12 },
  { name: "Nauru", lon: 166.9, lat: -0.52, dx: 14, dy: 6 }, { name: "Tarawa", lon: 173.0, lat: 1.4, dx: 16, dy: 4 },
  { name: "Honolulu", lon: -157.9, lat: 21.3, dx: 0, dy: -12 },
];

const land = feature(land110 as unknown as Topology, (land110 as unknown as Topology).objects.land as never) as never;
const detail = micro.detail as never;
const nations = micro.nations as never;

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const shortest = (from: number, to: number) => ((((to - from) % 360) + 540) % 360) - 180;
const ease = (t: number) => 1 - Math.pow(1 - t, 3);

export function Globe() {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const [held, setHeld] = useState(false);
  const [visible, setVisible] = useState(false);
  const [reduced, setReduced] = useState(true);
  const state = useRef({ lon: VIEWS[0].lon, lat: VIEWS[0].lat, zoom: VIEWS[0].zoom, target: VIEWS[0], drag: false, dragAt: 0, last: [0, 0] as [number, number], time: 0, from: { lon: VIEWS[0].lon, lat: VIEWS[0].lat, zoom: VIEWS[0].zoom }, start: 0 });

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(media.matches);
    sync();
    media.addEventListener("change", sync);
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.2 });
    if (wrap.current) io.observe(wrap.current);
    return () => { media.removeEventListener("change", sync); io.disconnect(); };
  }, []);

  const playing = visible && !held && !paused && !reduced;
  useEffect(() => {
    if (!playing) return;
    const t = setTimeout(() => setI((n) => (n + 1) % VIEWS.length), 7000);
    return () => clearTimeout(t);
  }, [playing, i]);

  // Start a glide to the chosen view.
  useEffect(() => {
    const s = state.current;
    s.from = { lon: s.lon, lat: s.lat, zoom: s.zoom };
    s.target = VIEWS[i];
    s.start = performance.now();
    if (reduced) { s.lon = VIEWS[i].lon; s.lat = VIEWS[i].lat; s.zoom = VIEWS[i].zoom; s.start = 0; }
  }, [i, reduced]);

  useEffect(() => {
    const cv = canvas.current;
    const box = wrap.current;
    if (!cv || !box) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    let raf = 0;
    let w = 0;
    let h = 0;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const resize = () => {
      w = box.clientWidth; h = box.clientHeight;
      cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(box);

    const proj = geoOrthographic().clipAngle(90).precision(0.4);
    const path = geoPath(proj, ctx);
    const grat = geoGraticule10();
    const sphere = { type: "Sphere" } as never;

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (!visible && state.current.start === 0) return;
      const s = state.current;
      if (!s.drag && s.start) {
        const t = Math.min(1, (now - s.start) / 2600);
        const k = ease(t);
        s.lon = s.from.lon + shortest(s.from.lon, s.target.lon) * k;
        s.lat = lerp(s.from.lat, s.target.lat, k);
        s.zoom = lerp(s.from.zoom, s.target.zoom, k);
        if (t >= 1) s.start = 0;
      }
      const k = Math.min(w, h) * 0.48 * s.zoom;
      proj.rotate([-s.lon, -s.lat]).scale(k).translate([w / 2, h / 2]);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      // deep space / sea beyond the globe
      const bg = ctx.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, "#0a1f24"); bg.addColorStop(1, "#050f12");
      ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);

      // atmosphere glow
      const glow = ctx.createRadialGradient(w / 2, h / 2, k * 0.96, w / 2, h / 2, k * 1.22);
      glow.addColorStop(0, "rgba(64,190,200,.38)"); glow.addColorStop(1, "rgba(64,190,200,0)");
      ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(w / 2, h / 2, k * 1.22, 0, Math.PI * 2); ctx.fill();

      // ocean
      const ocean = ctx.createRadialGradient(w / 2 - k * 0.35, h / 2 - k * 0.4, k * 0.1, w / 2, h / 2, k * 1.05);
      ocean.addColorStop(0, "#1b8a96"); ocean.addColorStop(0.55, "#0d5a64"); ocean.addColorStop(1, "#06303a");
      ctx.beginPath(); path(sphere); ctx.fillStyle = ocean; ctx.fill();

      // graticule
      ctx.beginPath(); path(grat); ctx.strokeStyle = "rgba(220,245,248,.13)"; ctx.lineWidth = 0.6; ctx.stroke();

      // land
      ctx.beginPath(); path(land); ctx.fillStyle = "#e9dcc0"; ctx.fill();
      ctx.strokeStyle = "rgba(22,18,13,.5)"; ctx.lineWidth = 0.6; ctx.stroke();
      if (s.zoom > 1.4) { ctx.beginPath(); path(detail); ctx.fillStyle = "#e9dcc0"; ctx.fill(); ctx.strokeStyle = "rgba(22,18,13,.55)"; ctx.lineWidth = 0.7; ctx.stroke(); }

      // Micronesian nations: a soft halo and a hard edge, so even the smallest atoll reads
      const near = s.zoom > 3;
      ctx.lineJoin = "round";
      ctx.beginPath(); path(nations); ctx.strokeStyle = "rgba(255,90,54,.3)"; ctx.lineWidth = near ? 13 : 8; ctx.stroke();
      ctx.beginPath(); path(nations); ctx.fillStyle = "#ff5a36"; ctx.fill();
      ctx.strokeStyle = "#ff5a36"; ctx.lineWidth = near ? 3.4 : 2.6; ctx.stroke();

      // routes from Lacey
      const t = now / 1000;
      ctx.lineWidth = 1.6; ctx.setLineDash([2, 7]); ctx.lineDashOffset = -t * 18; ctx.strokeStyle = "rgba(255,247,226,.9)";
      for (const to of ROUTES) { ctx.beginPath(); path({ type: "LineString", coordinates: [LACEY, to] } as never); ctx.stroke(); }
      ctx.setLineDash([]);

      // Lacey pin with pulse
      const lp = proj(LACEY);
      const front = lp && geoDistance(LACEY, [s.lon, s.lat]) < Math.PI / 2;
      if (lp && front) {
        const pulse = (t % 2.2) / 2.2;
        ctx.beginPath(); ctx.arc(lp[0], lp[1], 7 + pulse * 22, 0, Math.PI * 2); ctx.strokeStyle = `rgba(240,196,25,${0.7 * (1 - pulse)})`; ctx.lineWidth = 2; ctx.stroke();
        ctx.beginPath(); ctx.arc(lp[0], lp[1], 7, 0, Math.PI * 2); ctx.fillStyle = "#f0c419"; ctx.fill(); ctx.strokeStyle = "#16120d"; ctx.lineWidth = 2; ctx.stroke();
        label(ctx, "Lacey, Washington", lp[0] + 14, lp[1] + 5, "left", 15);
      }

      // island names when close
      if (s.zoom > 3) {
        for (const p of PLACES) {
          if (p.lon < 0) continue;
          if (geoDistance([p.lon, p.lat], [s.lon, s.lat]) > Math.PI / 2) continue;
          const q = proj([p.lon, p.lat]);
          if (!q) continue;
          ctx.beginPath(); ctx.arc(q[0], q[1], 3.4, 0, Math.PI * 2); ctx.fillStyle = "#f0c419"; ctx.fill(); ctx.strokeStyle = "#16120d"; ctx.lineWidth = 1.4; ctx.stroke();
          label(ctx, p.name, q[0] + p.dx, q[1] + p.dy, p.dx > 8 ? "left" : p.dx < -4 ? "right" : "center", 14);
        }
      } else if (s.zoom > 1.2) {
        const hp = proj([-157.9, 21.3]);
        if (hp && geoDistance([-157.9, 21.3], [s.lon, s.lat]) < Math.PI / 2 && s.zoom < 2) {
          ctx.beginPath(); ctx.arc(hp[0], hp[1], 3.4, 0, Math.PI * 2); ctx.fillStyle = "#f0c419"; ctx.fill(); ctx.strokeStyle = "#16120d"; ctx.lineWidth = 1.4; ctx.stroke();
          label(ctx, "Honolulu", hp[0], hp[1] - 11, "center", 14);
        }
      }

      // light falloff for roundness
      const shade = ctx.createRadialGradient(w / 2 - k * 0.4, h / 2 - k * 0.45, k * 0.2, w / 2, h / 2, k * 1.02);
      shade.addColorStop(0, "rgba(255,255,255,.1)"); shade.addColorStop(0.6, "rgba(0,0,0,0)"); shade.addColorStop(1, "rgba(0,12,18,.5)");
      ctx.beginPath(); path(sphere); ctx.fillStyle = shade; ctx.fill();
      ctx.beginPath(); path(sphere); ctx.strokeStyle = "rgba(190,240,245,.5)"; ctx.lineWidth = 1.2; ctx.stroke();
    };
    raf = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, [visible]);

  // Drag to spin.
  function down(e: React.PointerEvent) {
    const s = state.current;
    s.drag = true; s.start = 0; s.last = [e.clientX, e.clientY];
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setPaused(true);
  }
  function move(e: React.PointerEvent) {
    const s = state.current;
    if (!s.drag) return;
    const el = wrap.current;
    const k = (el ? Math.min(el.clientWidth, el.clientHeight) * 0.48 : 200) * s.zoom;
    const f = 180 / Math.PI / k;
    s.lon -= (e.clientX - s.last[0]) * f;
    s.lat = Math.max(-70, Math.min(70, s.lat + (e.clientY - s.last[1]) * f));
    s.last = [e.clientX, e.clientY];
  }
  function up() { state.current.drag = false; }

  const view = VIEWS[i];
  return (
    <figure style={{ margin: 0 }} onMouseEnter={() => setHeld(true)} onMouseLeave={() => setHeld(false)} onFocus={() => setHeld(true)} onBlur={() => setHeld(false)}>
      <div ref={wrap} className="sx-globe" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
        <canvas ref={canvas} role="img" aria-label={`A globe turned to ${view.name}, drawn from real coastlines. ${view.note}`} style={{ width: "100%", height: "100%", display: "block", touchAction: "pan-y" }} />
        <div className="sx-atlas-tag">
          <span className="sx-mono" style={{ color: "var(--so-gold)" }}>{view.kicker}</span>
          <b>{view.name}</b>
        </div>
        <span className="sx-globe-hint sx-mono" aria-hidden>Drag to turn</span>
      </div>
      <figcaption className="sx-atlas-foot">
        <p aria-live="polite">{view.note}</p>
        <div className="sx-atlas-ctl" role="group" aria-label="Choose a region">
          {VIEWS.map((v, n) => (
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

function label(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, align: CanvasTextAlign, size: number) {
  ctx.font = `600 ${size}px Fraunces, Georgia, serif`;
  ctx.textAlign = align;
  ctx.lineJoin = "round";
  ctx.lineWidth = 4;
  ctx.strokeStyle = "rgba(6,28,34,.85)";
  ctx.strokeText(text, x, y);
  ctx.fillStyle = "#fff8e6";
  ctx.fillText(text, x, y);
}

function geoDistance(a: [number, number], b: [number, number]) {
  const r = Math.PI / 180;
  const [l1, p1, l2, p2] = [a[0] * r, a[1] * r, b[0] * r, b[1] * r];
  return Math.acos(Math.min(1, Math.max(-1, Math.sin(p1) * Math.sin(p2) + Math.cos(p1) * Math.cos(p2) * Math.cos(l1 - l2))));
}

