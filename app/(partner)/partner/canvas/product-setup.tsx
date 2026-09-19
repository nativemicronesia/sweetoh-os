"use client";

import { useEffect, useRef, useState } from "react";
import { Plus, Trash2, Upload, X } from "lucide-react";
import { regionsFor, studioLayoutSchema, type PrintRegion, type StudioLayout } from "@/lib/domains/catalog/studio-layout";
import { regionPath } from "@/lib/studio/print-regions";
import { uploadSurfaceAction } from "../actions/builder";

type Surface = StudioLayout["surfaces"][number];
const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
const polygon = [{ x: .2, y: 0 }, { x: .8, y: 0 }, { x: 1, y: .5 }, { x: .8, y: 1 }, { x: .2, y: 1 }, { x: 0, y: .5 }];

/** Edits a private draft. The parent commits only after the server accepts it. */
export function ProductSetup({ surfaces, initialId, photoFor, onSave, onClose }: {
  surfaces: Surface[]; initialId: string;
  photoFor: (s: Surface) => string | null;
  onSave: (surfaces: Surface[], urls: Record<string, string>) => Promise<void>;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(() => structuredClone(surfaces).map(s => ({ ...s, printRegions: regionsFor(s) })));
  const [surfaceId, setSurfaceId] = useState(initialId);
  const [areaId, setAreaId] = useState(regionsFor(surfaces.find(s => s.id === initialId)!)[0]?.id ?? "");
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [changed, setChanged] = useState(false);
  const [closing, setClosing] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const upload = useRef<HTMLInputElement>(null);
  const drag = useRef<{ mode: "move" | "resize" | "point"; start: { x: number; y: number }; region: PrintRegion; index?: number } | null>(null);
  const current = draft.find(s => s.id === surfaceId)!;
  const region = current.printRegions.find(r => r.id === areaId);
  const src = (current.assetId && urls[current.assetId]) || photoFor(current);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    root.current?.querySelector<HTMLElement>("button")?.focus();
    return () => previous?.focus();
  }, []);
  function close() { if (busy) return; if (changed) setClosing(true); else onClose(); }
  function patchSurface(patch: Partial<Surface>) {
    setChanged(true);
    setDraft(ds => ds.map(s => s.id === surfaceId ? { ...s, ...patch } : s));
  }
  function patchRegion(patch: Partial<PrintRegion>) {
    if (!region) return;
    patchSurface({ printRegions: current.printRegions.map(r => r.id === areaId ? { ...r, ...patch } : r) });
  }
  function addRegion() {
    const r: PrintRegion = { id: crypto.randomUUID(), name: `Area ${current.printRegions.length + 1}`, shape: "rectangle", bounds: { x: .3, y: .3, width: .4, height: .4 } };
    patchSurface({ printRegions: [...current.printRegions, r] }); setAreaId(r.id);
  }
  function point(e: React.PointerEvent) {
    const b = svg.current!.getBoundingClientRect();
    return { x: clamp((e.clientX - b.left) / b.width), y: clamp((e.clientY - b.top) / b.height) };
  }
  function start(e: React.PointerEvent, r: PrintRegion, mode: "move" | "resize" | "point", index?: number) {
    e.preventDefault(); e.stopPropagation(); setAreaId(r.id);
    svg.current!.setPointerCapture(e.pointerId);
    drag.current = { mode, start: point(e), region: structuredClone(r), index };
  }
  function move(e: React.PointerEvent) {
    const d = drag.current; if (!d || busy) return;
    const p = point(e), dx = p.x - d.start.x, dy = p.y - d.start.y, b = d.region.bounds;
    if (d.mode === "point") {
      patchRegion({ points: d.region.points!.map((v, i) => i === d.index ? { x: clamp((p.x - b.x) / b.width), y: clamp((p.y - b.y) / b.height) } : v) });
    } else if (d.mode === "move") patchRegion({ bounds: { ...b, x: clamp(b.x + dx, 0, 1 - b.width), y: clamp(b.y + dy, 0, 1 - b.height) } });
    else patchRegion({ bounds: { ...b, width: clamp(b.width + dx, .001, 1 - b.x), height: clamp(b.height + dy, .001, 1 - b.y) } });
  }
  async function addSurface(file: File) {
    setBusy(true); setError("");
    try {
      const data = new FormData(); data.set("photo", file);
      const result = await uploadSurfaceAction(data);
      if (result.error || !result.assetId || !result.previewUrl) throw new Error(result.error || "Photo upload failed.");
      setUrls(u => ({ ...u, [result.assetId!]: result.previewUrl! }));
      const s: Surface & { printRegions: PrintRegion[] } = { id: crypto.randomUUID(), name: `Surface ${draft.length + 1}`, assetId: result.assetId, area: { x: 0, y: 0, width: 1, height: 1 }, printRegions: [], layers: [] };
      setDraft(ds => [...ds, s]); setSurfaceId(s.id); setAreaId(""); setChanged(true);
    } catch (e) { setError(e instanceof Error ? e.message : "Couldn’t upload photo."); }
    finally { setBusy(false); }
  }
  async function save() {
    setBusy(true); setError("");
    try {
      const next = draft.map(s => ({ ...s, area: s.printRegions[0]?.bounds ?? s.area, layers: s.layers.map(l => l.printRegionId && !s.printRegions.some(r => r.id === l.printRegionId) ? { ...l, printRegionId: undefined } : l) }));
      const parsed = studioLayoutSchema.safeParse({ version: 1, surfaces: next });
      if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Check your surface details.");
      await onSave(parsed.data.surfaces, urls);
      onClose();
    } catch (e) { setError(e instanceof Error ? e.message : "Couldn’t save. Your changes are still here."); }
    finally { setBusy(false); }
  }
  return <div className="pe-modal ps-modal" role="dialog" aria-modal="true" aria-label="Product setup" ref={root} onKeyDown={e => {
    if (e.key === "Escape") { e.stopPropagation(); close(); }
    if (e.key === "Tab") {
      const items = Array.from(root.current!.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), [tabindex="0"]')).filter(el => el.getClientRects().length);
      const first = items[0], last = items.at(-1);
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
    }
  }}>
    <div className="pe-modal-card ps-card">
      <div className="pe-modal-head"><div><h2>Product setup</h2><p className="pe-muted">Your surfaces. Your production method. Reused by every new design.</p></div><button className="pe-icon-btn" aria-label="Close product setup" disabled={busy} onClick={close}><X size={20}/></button></div>
      <fieldset className="ps-body" disabled={busy}>
        <div className="ps-workspace">
          <div className="ps-tabs" aria-label="Surfaces">{draft.map(s => <button key={s.id} className="pe-btn pe-btn-ghost" aria-pressed={s.id === surfaceId} onClick={() => { setSurfaceId(s.id); setAreaId(s.printRegions[0]?.id ?? ""); }}>{s.name || "Unnamed surface"}<small>{s.printRegions.length} areas</small></button>)}
            <button className="pe-btn pe-btn-ghost" disabled={busy || draft.length >= 12} onClick={() => upload.current?.click()}><Upload size={15}/> Add surface photo</button>
            <input ref={upload} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" aria-label="New surface photo" onChange={e => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void addSurface(f); }}/>
          </div>
          <svg ref={svg} className="ps-canvas" viewBox="0 0 720 720" aria-label="Print area editor" onPointerMove={move} onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }}>
            {src && <image href={src} width="720" height="720" preserveAspectRatio="xMidYMid meet"/>}
            {[...current.printRegions].sort((a, b) => Number(a.id === areaId) - Number(b.id === areaId)).map(r => <g key={r.id}>
              <path d={regionPath(r)} fill={r.id === areaId ? "#28624730" : "#28624710"} stroke={r.id === areaId ? "#17673e" : "#6e8578"} strokeWidth="2" strokeDasharray={r.id === areaId ? undefined : "6 4"} onPointerDown={e => start(e, r, "move")} style={{ cursor: "move" }}/>
              <text x={r.bounds.x * 720 + 8} y={r.bounds.y * 720 + 20} fill="#174b32" fontSize="14" fontWeight="600" pointerEvents="none" paintOrder="stroke" stroke="white" strokeWidth="3">{r.name}</text>
              {r.id === areaId && <>
                <rect x={(r.bounds.x + r.bounds.width) * 720 - 8} y={(r.bounds.y + r.bounds.height) * 720 - 8} width="16" height="16" rx="3" fill="white" stroke="#17673e" strokeWidth="2" onPointerDown={e => start(e, r, "resize")} style={{ cursor: "nwse-resize" }}/>
                {r.shape === "polygon" && r.points?.map((p, i) => <circle key={i} cx={(r.bounds.x + p.x * r.bounds.width) * 720} cy={(r.bounds.y + p.y * r.bounds.height) * 720} r="7" fill="white" stroke="#17673e" strokeWidth="2" onPointerDown={e => start(e, r, "point", i)} style={{ cursor: "crosshair" }}/>)}</>}
            </g>)}
          </svg>
          <p className="pe-muted ps-hint">Drag an area to move it. Drag its handle to resize. Custom shapes have movable points.</p>
        </div>
        <aside className="ps-controls">
          <label className="ps-field">Surface name<input className="pe-input" value={current.name} maxLength={60} onChange={e => patchSurface({ name: e.target.value })}/></label>
          <div className="ps-area-list"><div className="pe-row"><h3>Print areas</h3><button className="pe-icon-btn" aria-label="Add print area" disabled={current.printRegions.length >= 24} onClick={addRegion}><Plus size={18}/></button></div>
            {current.printRegions.map(r => <button key={r.id} className="ps-area-item" aria-pressed={r.id === areaId} onClick={() => setAreaId(r.id)}>{r.name || "Unnamed area"}<small>{r.shape}</small></button>)}
            {!current.printRegions.length && <p className="pe-muted">No print areas yet. Add one wherever you can print.</p>}
          </div>
          {region && <>
            <label className="ps-field">Area name<input className="pe-input" value={region.name} maxLength={60} onChange={e => patchRegion({ name: e.target.value })}/></label>
            <label className="ps-field">Shape<select aria-label="Shape" className="pe-select" value={region.shape} onChange={e => patchRegion({ shape: e.target.value as PrintRegion["shape"], points: e.target.value === "polygon" ? region.points ?? polygon : undefined })}><option value="rectangle">Rectangle</option><option value="ellipse">Circle / oval</option><option value="polygon">Custom shape</option></select></label>
            {region.shape === "polygon" && <div className="pe-row"><button className="pe-btn pe-btn-ghost" disabled={(region.points?.length ?? 0) >= 32} onClick={() => { const ps = region.points!; const a = ps[ps.length - 1], b = ps[0]; patchRegion({ points: [...ps, { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }] }); }}>Add point</button><button className="pe-btn pe-btn-ghost" disabled={region.points!.length <= 3} onClick={() => patchRegion({ points: region.points!.slice(0, -1) })}>Remove point</button></div>}
            <div className="pe-grid2">{([['x', 'Left'], ['y', 'Top'], ['width', 'Width'], ['height', 'Height']] as const).map(([key, label]) => <label className="ps-field" key={key}>{label} (%)<input className="pe-input" aria-label={`Area ${label.toLowerCase()} percent`} type="number" min={key === 'x' || key === 'y' ? 0 : 0.1} max="100" step="0.1" value={Math.round(region.bounds[key] * 1000) / 10} onChange={e => {
              const v = Number(e.target.value) / 100, b = region.bounds;
              patchRegion({ bounds: { ...b, [key]: key === 'x' ? clamp(v, 0, 1 - b.width) : key === 'y' ? clamp(v, 0, 1 - b.height) : key === 'width' ? clamp(v, .001, 1 - b.x) : clamp(v, .001, 1 - b.y) } });
            }}/></label>)}</div>
            <button className="pe-btn pe-btn-ghost" onClick={() => patchRegion({ bounds: { x: 0, y: 0, width: 1, height: 1 } })}>Use full surface</button>
            <label className="ps-field">Production dimensions<select aria-label="Production dimensions" className="pe-select" value={region.dimensions?.unit ?? "none"} onChange={e => {
              const unit = e.target.value as "in" | "cm" | "none", d = region.dimensions;
              const factor = d && unit !== d.unit ? unit === "cm" ? 2.54 : 1 / 2.54 : 1;
              patchRegion({ dimensions: unit === "none" ? undefined : { width: Math.round((d?.width ?? 10) * factor * 100) / 100, height: Math.round((d?.height ?? 10) * factor * 100) / 100, unit } });
            }}><option value="none">Not set</option><option value="in">Inches</option><option value="cm">Centimeters</option></select></label>
            {region.dimensions && <div className="pe-grid2">{(["width", "height"] as const).map(key => <label key={key} className="ps-field">Print {key} ({region.dimensions!.unit})<input className="pe-input" type="number" min="0.01" max="1200" step="0.01" value={region.dimensions![key]} onChange={e => patchRegion({ dimensions: { ...region.dimensions!, [key]: Number(e.target.value) } })}/></label>)}</div>}
            <button className="pe-btn ps-danger" onClick={() => { patchSurface({ printRegions: current.printRegions.filter(r => r.id !== areaId) }); setAreaId(current.printRegions.find(r => r.id !== areaId)?.id ?? ""); }}><Trash2 size={15}/> Delete print area</button>
          </>}
          {draft.length > 1 && <details><summary className="pe-muted">Remove this surface</summary><p className="pe-muted">Removes this surface and its design layers from this design.</p><button className="pe-btn ps-danger" onClick={() => { const next = draft.filter(s => s.id !== surfaceId); setDraft(next); setSurfaceId(next[0].id); setAreaId(next[0].printRegions[0]?.id ?? ""); setChanged(true); }}>Delete {current.name}</button></details>}
        </aside>
      </fieldset>
      {busy && <p className="pe-muted" role="status">Saving your product photos and setup…</p>}
      {error && <p className="own-error" role="alert">{error}</p>}
      <footer className="ps-footer"><span className="pe-muted">Saved to the product. Existing saved designs keep their own layout.</span><button className="pe-btn pe-btn-ghost" disabled={busy} onClick={close}>Cancel</button><button className="pe-btn pe-btn-primary" disabled={busy} onClick={() => void save()}>{busy ? "Saving…" : "Save product setup"}</button></footer>
      {closing && <div className="ps-discard" role="alertdialog" aria-label="Discard setup changes"><p>Discard your unsaved setup changes?</p><button className="pe-btn pe-btn-ghost" onClick={() => setClosing(false)}>Keep editing</button><button className="pe-btn pe-btn-primary" onClick={onClose}>Discard changes</button></div>}
    </div>
  </div>;
}
