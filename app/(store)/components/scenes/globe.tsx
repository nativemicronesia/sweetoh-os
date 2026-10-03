"use client";

import { useEffect, useRef, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { geoGraticule10, geoOrthographic, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import type { Topology } from "topojson-specification";
import land110 from "world-atlas/land-110m.json";
import micro from "./micronesia-geo.json";

/**
 * One interactive globe. Real coastlines (Natural Earth), every Micronesian nation in vermilion, and the true
 * great-circle routes out from Lacey, Washington. Drag to turn, use the buttons or pinch to zoom, and select a
 * dot to see how shipping works there. Drawn on a canvas so it stays smooth on phones.
 */

type Pose = { lon: number; lat: number; zoom: number };
const HOME: Pose = { lon: -168, lat: 28, zoom: 1 };
const MICRONESIA: Pose = { lon: 154, lat: 9, zoom: 3.4 };
const MIN_ZOOM = 1;
const MAX_ZOOM = 9;

const LACEY: [number, number] = [-122.8, 47.0];
const PLACES: { name: string; lon: number; lat: number; dx: number; dy: number }[] = [
  { name: "Palau", lon: 134.5, lat: 7.5, dx: -8, dy: -10 }, { name: "Yap", lon: 138.1, lat: 9.5, dx: 0, dy: -11 },
  { name: "Guam", lon: 144.8, lat: 13.45, dx: 0, dy: 20 }, { name: "Saipan", lon: 145.7, lat: 15.2, dx: 14, dy: -6 },
  { name: "Chuuk", lon: 151.8, lat: 7.4, dx: 0, dy: 20 }, { name: "Pohnpei", lon: 158.2, lat: 6.9, dx: 0, dy: -12 },
  { name: "Kosrae", lon: 163.0, lat: 5.3, dx: 0, dy: 20 }, { name: "Majuro", lon: 171.4, lat: 7.1, dx: 0, dy: -12 },
  { name: "Nauru", lon: 166.9, lat: -0.52, dx: 14, dy: 6 }, { name: "Tarawa", lon: 173.0, lat: 1.4, dx: 16, dy: 4 },
  { name: "Kwajalein", lon: 167.7, lat: 8.7, dx: 0, dy: -12 }, { name: "Kiritimati", lon: -157.4, lat: 1.9, dx: 0, dy: 20 },
  { name: "Honolulu", lon: -157.9, lat: 21.3, dx: 0, dy: -12 },
];

const land = feature(land110 as unknown as Topology, (land110 as unknown as Topology).objects.land as never) as never;
const detail = micro.detail as never;
const nations = micro.nations as never;

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const shortest = (from: number, to: number) => ((((to - from) % 360) + 540) % 360) - 180;
const ease = (t: number) => 1 - Math.pow(1 - t, 3);
const clampZoom = (z: number) => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z));

export type GlobeDestination = { code: string; name: string; lon: number; lat: number; orders: number };

export function Globe({ destinations = [], estimates = {} }: { destinations?: GlobeDestination[]; estimates?: Record<string, string> }) {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const [reduced, setReduced] = useState(true);
  const hits = useRef<{ code: string; x: number; y: number }[]>([]);
  const selRef = useRef<string | null>(null);
  useEffect(() => { selRef.current = selected; }, [selected]);
  const dests = useRef(destinations);
  useEffect(() => { dests.current = destinations; }, [destinations]);
  const visibleRef = useRef(false);
  useEffect(() => { visibleRef.current = visible; }, [visible]);
  const redRef = useRef(true);
  useEffect(() => { redRef.current = reduced; }, [reduced]);
  const state = useRef({ ...HOME, target: HOME as Pose, from: HOME as Pose, start: 0, drag: false, moved: 0, last: [0, 0] as [number, number], pointers: new Map<number, [number, number]>(), pinch: 0 });

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(media.matches);
    sync();
    media.addEventListener("change", sync);
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.1 });
    if (wrap.current) io.observe(wrap.current);
    return () => { media.removeEventListener("change", sync); io.disconnect(); };
  }, []);

  function glide(to: Pose) {
    const s = state.current;
    if (redRef.current) { s.lon = to.lon; s.lat = to.lat; s.zoom = to.zoom; s.start = 0; return; }
    s.from = { lon: s.lon, lat: s.lat, zoom: s.zoom };
    s.target = to;
    s.start = performance.now();
  }
  const zoomBy = (f: number) => { const s = state.current; glide({ lon: s.lon, lat: s.lat, zoom: clampZoom(s.zoom * f) }); };

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
      if (!visibleRef.current) return;
      const s = state.current;
      if (!s.drag && s.start) {
        const t = Math.min(1, (now - s.start) / 1800);
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
      const real = dests.current;
      const routeTo: [number, number][] = real.map((d) => [d.lon, d.lat]);
      for (const to of routeTo) { ctx.beginPath(); path({ type: "LineString", coordinates: [LACEY, to] } as never); ctx.stroke(); }
      ctx.setLineDash([]);
      hits.current = [];
      for (const d of real) {
        if (geoDistance([d.lon, d.lat], [s.lon, s.lat]) > Math.PI / 2) continue;
        const q = proj([d.lon, d.lat]);
        if (!q) continue;
        hits.current.push({ code: d.code, x: q[0], y: q[1] });
        const rad = 4 + Math.min(6, Math.log2(1 + d.orders));
        const sel = d.code === selRef.current;
        ctx.beginPath(); ctx.arc(q[0], q[1], rad + (sel ? 7 : 4), 0, Math.PI * 2); ctx.fillStyle = sel ? "rgba(240,196,25,.45)" : "rgba(240,196,25,.25)"; ctx.fill();
        ctx.beginPath(); ctx.arc(q[0], q[1], rad, 0, Math.PI * 2); ctx.fillStyle = "#f0c419"; ctx.fill(); ctx.strokeStyle = "#16120d"; ctx.lineWidth = 1.6; ctx.stroke();
        if (sel || s.zoom > 1.6) label(ctx, d.name, q[0], q[1] - rad - 8, "center", 13);
      }

      // Lacey: the hub everything leaves from
      const lp = proj(LACEY);
      const front = lp && geoDistance(LACEY, [s.lon, s.lat]) < Math.PI / 2;
      if (lp && front) {
        const pulse = (t % 2.4) / 2.4;
        ctx.beginPath(); ctx.arc(lp[0], lp[1], 11 + pulse * 34, 0, Math.PI * 2); ctx.strokeStyle = `rgba(240,196,25,${0.75 * (1 - pulse)})`; ctx.lineWidth = 2.4; ctx.stroke();
        ctx.beginPath(); ctx.arc(lp[0], lp[1], 15, 0, Math.PI * 2); ctx.fillStyle = "rgba(240,196,25,.3)"; ctx.fill();
        ctx.beginPath(); ctx.arc(lp[0], lp[1], 9, 0, Math.PI * 2); ctx.fillStyle = "#f0c419"; ctx.fill(); ctx.strokeStyle = "#16120d"; ctx.lineWidth = 2.4; ctx.stroke();
        ctx.beginPath(); ctx.arc(lp[0], lp[1], 3, 0, Math.PI * 2); ctx.fillStyle = "#16120d"; ctx.fill();
        const flip = lp[0] > w * 0.55;
        label(ctx, "Lacey, Washington", lp[0] + (flip ? -18 : 18), lp[1] + 6, flip ? "right" : "left", w < 520 ? 14 : 17);
      }

      // every island named, as soon as there is room for it
      if (s.zoom > 2.1) {
        const placed: [number, number, number, number][] = [];
        const size = s.zoom > 4 ? 14 : 12;
        for (const p of PLACES) {
          if (geoDistance([p.lon, p.lat], [s.lon, s.lat]) > Math.PI / 2) continue;
          const q = proj([p.lon, p.lat]);
          if (!q) continue;
          ctx.beginPath(); ctx.arc(q[0], q[1], 3.2, 0, Math.PI * 2); ctx.fillStyle = "#f0c419"; ctx.fill(); ctx.strokeStyle = "#16120d"; ctx.lineWidth = 1.3; ctx.stroke();
          ctx.font = `600 ${size}px Fraunces, Georgia, serif`;
          const tw = ctx.measureText(p.name).width;
          const align: CanvasTextAlign = p.dx > 8 ? "left" : p.dx < -4 ? "right" : "center";
          const x = q[0] + p.dx, y = q[1] + p.dy;
          const left = align === "left" ? x : align === "right" ? x - tw : x - tw / 2;
          const rect: [number, number, number, number] = [left - 3, y - size, left + tw + 3, y + 4];
          if (placed.some((o) => rect[0] < o[2] && rect[2] > o[0] && rect[1] < o[3] && rect[3] > o[1])) continue;
          placed.push(rect);
          label(ctx, p.name, x, y, align, size);
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
  }, []);

  function down(e: React.PointerEvent) {
    const s = state.current;
    s.pointers.set(e.pointerId, [e.clientX, e.clientY]);
    s.drag = true; s.start = 0; s.moved = 0; s.last = [e.clientX, e.clientY];
    if (s.pointers.size === 2) { const [a, b] = [...s.pointers.values()]; s.pinch = Math.hypot(a[0] - b[0], a[1] - b[1]); }
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }
  function move(e: React.PointerEvent) {
    const s = state.current;
    if (!s.drag) return;
    s.pointers.set(e.pointerId, [e.clientX, e.clientY]);
    if (s.pointers.size === 2) {
      const [a, b] = [...s.pointers.values()];
      const d = Math.hypot(a[0] - b[0], a[1] - b[1]);
      if (s.pinch) s.zoom = clampZoom(s.zoom * (d / s.pinch));
      s.pinch = d; s.moved += 10;
      return;
    }
    const el = wrap.current;
    const k = (el ? Math.min(el.clientWidth, el.clientHeight) * 0.48 : 200) * s.zoom;
    const f = 180 / Math.PI / k;
    s.moved += Math.abs(e.clientX - s.last[0]) + Math.abs(e.clientY - s.last[1]);
    s.lon -= (e.clientX - s.last[0]) * f;
    s.lat = Math.max(-75, Math.min(75, s.lat + (e.clientY - s.last[1]) * f));
    s.last = [e.clientX, e.clientY];
  }
  function up(e: React.PointerEvent) {
    const s = state.current;
    s.pointers.delete(e.pointerId);
    s.pinch = 0;
    if (s.pointers.size > 0) return;
    s.drag = false;
    if (s.moved < 6 && e.type === "pointerup") {
      const box = wrap.current?.getBoundingClientRect();
      if (!box) return;
      const x = e.clientX - box.left;
      const y = e.clientY - box.top;
      let best: { code: string; d: number } | null = null;
      for (const h of hits.current) { const d = Math.hypot(h.x - x, h.y - y); if (d < 24 && (!best || d < best.d)) best = { code: h.code, d }; }
      setSelected(best ? best.code : null);
      if (best) {
        const dst = dests.current.find((d) => d.code === best!.code);
        if (dst) glide({ lon: dst.lon, lat: dst.lat, zoom: Math.max(s.zoom, 2) });
      }
    }
  }
  function key(e: React.KeyboardEvent) {
    const s = state.current;
    const step = 12 / s.zoom;
    if (e.key === "ArrowLeft") glide({ lon: s.lon - step, lat: s.lat, zoom: s.zoom });
    else if (e.key === "ArrowRight") glide({ lon: s.lon + step, lat: s.lat, zoom: s.zoom });
    else if (e.key === "ArrowUp") glide({ lon: s.lon, lat: Math.min(75, s.lat + step), zoom: s.zoom });
    else if (e.key === "ArrowDown") glide({ lon: s.lon, lat: Math.max(-75, s.lat - step), zoom: s.zoom });
    else if (e.key === "+" || e.key === "=") zoomBy(1.5);
    else if (e.key === "-") zoomBy(1 / 1.5);
    else return;
    e.preventDefault();
  }
  function wheel(e: React.WheelEvent) {
    if (!(e.ctrlKey || e.metaKey)) return;
    const s = state.current;
    s.start = 0;
    s.zoom = clampZoom(s.zoom * Math.exp(-e.deltaY * 0.01));
  }

  const pick = destinations.find((d) => d.code === selected);
  return (
    <figure style={{ margin: 0 }}>
      <div ref={wrap} className="sx-globe" tabIndex={0} role="group" aria-label="Interactive globe. Drag to turn, plus and minus to zoom, arrow keys to move." onKeyDown={key} onWheel={wheel} onDoubleClick={() => zoomBy(1.8)} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
        <canvas ref={canvas} role="img" aria-label="A globe of the Pacific and the world drawn from real coastlines. Lacey, Washington is the hub where every piece is made; the Micronesian islands are highlighted in red." style={{ width: "100%", height: "100%", display: "block", touchAction: "pan-y" }} />
        <div className="sx-atlas-tag">
          <span className="sx-mono" style={{ color: "var(--so-gold)" }}>Made in Lacey, Washington</span>
          <b>Rooted in Micronesia</b>
        </div>
        {pick && (
          <div className="sx-globe-card" role="status">
            <b>{pick.name}</b>
            <span>{estimates[pick.code] ?? "We share a delivery estimate at checkout."}</span>
          </div>
        )}
        <div className="sx-globe-ctl">
          <button type="button" className="sx-globe-btn" onClick={() => zoomBy(1.6)} aria-label="Zoom in"><Plus size={18} aria-hidden /></button>
          <button type="button" className="sx-globe-btn" onClick={() => zoomBy(1 / 1.6)} aria-label="Zoom out"><Minus size={18} aria-hidden /></button>
        </div>
        <span className="sx-globe-hint sx-mono" aria-hidden>{destinations.length ? "Drag to turn · select a dot" : "Drag to turn · zoom for island names"}</span>
      </div>
      <figcaption className="sx-atlas-foot">
        <p>{destinations.length ? `Shipped to ${destinations.length} ${destinations.length === 1 ? "country" : "countries"} so far. Select a dot to see how shipping works there.` : "Lacey, Washington is where every piece is made. The islands of Palau, the FSM, Guam and the Marianas, the Marshall Islands, Nauru and Kiribati are in red. Zoom in a little to see them by name."}</p>
        <div className="sx-atlas-ctl" role="group" aria-label="Jump to">
          <button type="button" className="sx-chip" onClick={() => glide(MICRONESIA)}>Micronesia</button>
          <button type="button" className="sx-chip sx-chip-ghost" onClick={() => glide(HOME)}>Reset</button>
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

