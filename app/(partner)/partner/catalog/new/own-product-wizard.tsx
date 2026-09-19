"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Camera, Check, ImagePlus, Loader2, Plus, Sparkles, Trash2, X } from "lucide-react";
import { colorHex, type VariantColor } from "@/lib/domains/catalog/variants";
import type { BlankProposal } from "@/lib/capabilities";
import { createOwnBlankAction, turnPhotoIntoBlankAction } from "../../actions/capabilities";
import { uploadSurfaceAction } from "../../actions/builder";
import { AreaEditor, type Area } from "./area-editor";

type TypeOption = { value: string; label: string; category: string; w: number; h: number; sizes: string[] };
type Photo = { file: File; url: string; label: string };
type View = BlankProposal["views"][number] & { useCutout: boolean };

const VIEW_LABELS = ["Front", "Back", "Left side", "Right side"];
const WORKING = ["Removing the background…", "Understanding your product…", "Finding printable areas…", "Preparing your blank…"];

export function OwnProductWizard({ types }: { types: TypeOption[] }) {
  const [step, setStep] = useState<"photos" | "working" | "confirm">("photos");
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [typeHint, setTypeHint] = useState("");
  const [error, setError] = useState("");
  const [tick, setTick] = useState(0);
  const [proposal, setProposal] = useState<BlankProposal | null>(null);
  const [name, setName] = useState("");
  const [productType, setProductType] = useState("other");
  const [views, setViews] = useState<View[]>([]);
  const [active, setActive] = useState(0);
  const [colors, setColors] = useState<VariantColor[]>([]);
  const [sizes, setSizes] = useState<string[]>([]);
  const [newColor, setNewColor] = useState("");
  const [newSize, setNewSize] = useState("");
  const [manual, setManual] = useState(false);
  const [saving, setSaving] = useState(false);
  const upload = useRef<HTMLInputElement>(null);
  const camera = useRef<HTMLInputElement>(null);

  const shown = useRef<Photo[]>([]);
  shown.current = photos;
  // Release preview URLs only when leaving the page; they stay in use while editing.
  useEffect(() => () => shown.current.forEach((p) => URL.revokeObjectURL(p.url)), []);
  useEffect(() => {
    if (step !== "working") return;
    const t = setInterval(() => setTick((n) => n + 1), 2600);
    return () => clearInterval(t);
  }, [step]);

  function addFiles(list: FileList | null) {
    if (!list) return;
    const next = [...photos];
    for (const file of Array.from(list)) {
      if (next.length >= 4) break;
      if (!/^image\/(jpeg|png|webp)$/.test(file.type)) continue;
      next.push({ file, url: URL.createObjectURL(file), label: VIEW_LABELS[next.length] ?? `View ${next.length + 1}` });
    }
    setPhotos(next);
  }

  async function usePhotos() {
    setManual(true); setError(""); setStep("working");
    try {
      const next: View[] = [];
      for (const p of photos) {
        const data = new FormData(); data.set("photo", p.file);
        const result = await uploadSurfaceAction(data);
        if (result.error || !result.assetId || !result.previewUrl) throw new Error(result.error || "Photo upload failed.");
        next.push({ label: p.label, position: p.label.toLowerCase().replaceAll(" ", "_"), originalAssetId: result.assetId, originalUrl: result.previewUrl, cutoutAssetId: null, cutoutUrl: null, useCutout: false, area: { x: 0, y: 0, width: 1, height: 1 }, printWidthIn: 10, printHeightIn: 10 });
      }
      setViews(next); setName(photos[0]?.file.name.replace(/\.[^.]+$/, "") ?? "My product");
      setProductType(typeHint || "other"); setColors([]); setSizes([]); setActive(0); setStep("confirm");
    } catch (e) { setError(e instanceof Error ? e.message : "Upload failed."); setStep("photos"); }
  }

  async function process() {
    setManual(false);
    setError("");
    setStep("working");
    const form = new FormData();
    photos.forEach((p) => {
      form.append("photos", p.file);
      form.append("labels", p.label);
    });
    if (typeHint) form.set("typeHint", typeHint);
    const result = await turnPhotoIntoBlankAction(form);
    if (!result.ok) {
      setError(result.error);
      setStep("photos");
      return;
    }
    const p = result.proposal;
    setProposal(p);
    setName(p.name);
    setProductType(p.productType);
    setViews(p.views.map((v) => ({ ...v, useCutout: Boolean(v.cutoutAssetId) })));
    setColors([p.color]);
    setSizes(p.sizes);
    setActive(0);
    setStep("confirm");
  }

  const view = views[active];
  const typeOption = useMemo(() => types.find((t) => t.value === productType), [types, productType]);

  function patchView(i: number, patch: Partial<View>) {
    setViews((vs) => vs.map((v, j) => (j === i ? { ...v, ...patch } : v)));
  }
  function setInches(i: number, key: "printWidthIn" | "printHeightIn", value: number) {
    if (!Number.isFinite(value) || value <= 0) return;
    patchView(i, { [key]: value });
  }

  function changeType(value: string) {
    setProductType(value);
    const t = types.find((x) => x.value === value);
    if (!t) return;
    setSizes(t.sizes);

  }
  function addColor() {
    const n = newColor.trim();
    if (!n || colors.some((c) => c.name.toLowerCase() === n.toLowerCase())) return;
    setColors([...colors, { name: n, hex: colorHex(n) }]);
    setNewColor("");
  }
  function addSize() {
    const s = newSize.trim();
    if (!s || sizes.includes(s)) return;
    setSizes([...sizes, s]);
    setNewSize("");
  }
  async function save() {
    setSaving(true);
    setError("");
    const result = await createOwnBlankAction({
      name,
      productType,
      colors,
      sizes,
      views: views.map((v) => ({
        label: v.label,
        position: v.position,
        assetId: v.useCutout && v.cutoutAssetId ? v.cutoutAssetId : v.originalAssetId,
        originalAssetId: v.originalAssetId,
        area: v.area,
        printRegions: manual ? [] : undefined,
        printWidthIn: v.printWidthIn,
        printHeightIn: v.printHeightIn,
      })),
    });
    if (result && !result.ok) {
      setError(result.error);
      setSaving(false);
    }
  }

  return (
    <div className="own">
      <Link href="/partner/catalog" className="own-back">
        <ArrowLeft size={16} /> Catalog
      </Link>

      {step !== "confirm" && (
        <section className="own-card">
          <header className="own-head">
            <span className="own-badge">
              <Sparkles size={14} /> Turn photo into blank
            </span>
            <h1>Add your own product</h1>
            <p>Start with your product photos. Set up the surfaces and print areas for the way you produce it. AI can suggest a starting point if you want.</p>
          </header>

          {step === "photos" && (
            <>
              <div className="own-photos">
                {photos.map((p, i) => (
                  <figure key={p.url}>
                    <img src={p.url} alt="" />
                    <select
                      value={p.label}
                      aria-label="Which side is this?"
                      onChange={(e) => setPhotos(photos.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))}
                    >
                      {VIEW_LABELS.map((l) => (
                        <option key={l}>{l}</option>
                      ))}
                    </select>
                    <button aria-label="Remove photo" onClick={() => { URL.revokeObjectURL(p.url); setPhotos(photos.filter((_, j) => j !== i)); }}>
                      <X size={14} />
                    </button>
                  </figure>
                ))}
                {photos.length < 4 && (
                  <div className="own-add">
                    <button onClick={() => upload.current?.click()}>
                      <ImagePlus size={24} />
                      <strong>{photos.length ? "Add another side" : "Upload photos"}</strong>
                      <span>Up to 4 · front, back, sides</span>
                    </button>
                    <button className="own-camera" onClick={() => camera.current?.click()}>
                      <Camera size={18} /> Take a photo
                    </button>
                  </div>
                )}
              </div>
              <input ref={upload} type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" aria-label="Upload product photos" onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
              <input ref={camera} type="file" accept="image/*" capture="environment" className="sr-only" aria-label="Take a product photo" onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
              <ul className="own-tips">
                <li>Lay it flat or hang it straight on, front facing the camera.</li>
                <li>A plain wall, sheet or table behind it works best.</li>
                <li>Use a blank one (no print) if you have it.</li>
              </ul>
              <label className="own-field own-inline">
                What is it? <span>(optional — we’ll figure it out)</span>
                <select value={typeHint} onChange={(e) => setTypeHint(e.target.value)}>
                  <option value="">Detect automatically</option>
                  {types.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </label>
              <div className="own-actions" style={{ gap: 10, flexWrap: "wrap" }}>
                <button className="pf-btn pf-btn-primary pf-btn-lg" disabled={!photos.length} onClick={() => void usePhotos()}>Use my photos</button>
                <button className="pf-btn pf-btn-outline pf-btn-lg" disabled={!photos.length} onClick={() => void process()}>
                  <Sparkles size={16} /> Suggest setup with AI
                </button>
              </div>
            </>
          )}

          {step === "working" && (
            <div className="own-working" role="status">
              <div className="own-working-photos">
                {photos.map((p) => (
                  <img key={p.url} src={p.url} alt="" />
                ))}
                <span className="own-scan" />
              </div>
              <p>
                <Loader2 size={18} className="pe-spin" /> {manual ? "Uploading your product photos…" : WORKING[tick % WORKING.length]}
              </p>
              <small>Keep this page open while your photos are prepared.</small>
            </div>
          )}
          {error && <p role="alert" className="own-error">{error}</p>}
        </section>
      )}

      {step === "confirm" && view && (
        <section className="own-confirm">
          <div className="own-stage">
            <div className="own-view-tabs" role="tablist">
              {views.map((v, i) => (
                <button key={v.originalAssetId} role="tab" aria-selected={i === active} onClick={() => setActive(i)}>
                  <img src={v.useCutout && v.cutoutUrl ? v.cutoutUrl : v.originalUrl} alt="" />
                  {v.label}
                </button>
              ))}
            </div>
            {manual ? <><img src={view.originalUrl} alt={view.label} style={{ width: "100%", maxHeight: "60vh", objectFit: "contain" }}/><p className="own-note">Next, add any number of print areas in Product setup. You choose their shapes, sizes and placement.</p></> : <AreaEditor
              src={view.useCutout && view.cutoutUrl ? view.cutoutUrl : view.originalUrl}
              area={view.area}
              checker={view.useCutout}
              onChange={(a: Area) => patchView(active, { area: a })}
            />}
            {!manual && <p className="own-hint">Drag the box to where you print on this {typeOption?.label.toLowerCase() ?? "product"}. Pull the corners to resize.</p>}
            {view.cutoutUrl && (
              <label className="own-check">
                <input type="checkbox" checked={view.useCutout} onChange={(e) => patchView(active, { useCutout: e.target.checked })} />
                Use the cleaned-up version (background removed)
              </label>
            )}
          </div>

          <aside className="own-panel">
            <h1>Confirm your blank</h1>
            {proposal?.note && <p className="own-note">{proposal.note}</p>}
            <label className="own-field">
              Name
              <input value={name} onChange={(e) => setName(e.target.value)} maxLength={180} />
            </label>
            <label className="own-field">
              Product type
              <select value={productType} onChange={(e) => changeType(e.target.value)}>
                {types.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
            {!manual && <div className="own-field">
              {view.label} print size (inches)
              <div className="own-inches">
                <input type="number" min={0.5} step={0.5} value={view.printWidthIn} onChange={(e) => setInches(active, "printWidthIn", Number(e.target.value))} aria-label="Print width in inches" />
                <span>×</span>
                <input type="number" min={0.5} step={0.5} value={view.printHeightIn} onChange={(e) => setInches(active, "printHeightIn", Number(e.target.value))} aria-label="Print height in inches" />
              </div>
            </div>}
            <div className="own-field">
              Colors you stock
              <div className="own-chips">
                {colors.map((c) => (
                  <span key={c.name} className="own-chip">
                    <label className="own-swatch" style={{ background: c.hex }} title="Change swatch color">
                      <input type="color" value={c.hex} onChange={(e) => setColors(colors.map((x) => (x.name === c.name ? { ...x, hex: e.target.value } : x)))} />
                    </label>
                    {c.name}
                    <button aria-label={`Remove ${c.name}`} onClick={() => setColors(colors.filter((x) => x.name !== c.name))}>
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
              <div className="own-add-row">
                <input value={newColor} onChange={(e) => setNewColor(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addColor()} placeholder="Add a color, e.g. Navy" />
                <button className="pe-icon-btn" onClick={addColor} aria-label="Add color">
                  <Plus size={16} />
                </button>
              </div>
            </div>
            <div className="own-field">
              Sizes you stock <span>(optional)</span>
              <div className="own-chips">
                {sizes.map((s) => (
                  <span key={s} className="own-chip">
                    {s}
                    <button aria-label={`Remove ${s}`} onClick={() => setSizes(sizes.filter((x) => x !== s))}>
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
              <div className="own-add-row">
                <input value={newSize} onChange={(e) => setNewSize(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addSize()} placeholder="Add a size, e.g. XL" />
                <button className="pe-icon-btn" onClick={addSize} aria-label="Add size">
                  <Plus size={16} />
                </button>
              </div>
            </div>
            {views.length > 1 && (
              <button className="own-remove-view" onClick={() => { setViews(views.filter((_, i) => i !== active)); setActive(0); }}>
                <Trash2 size={14} /> Remove the {view.label.toLowerCase()} view
              </button>
            )}
            {error && <p role="alert" className="own-error">{error}</p>}
            <button className="pf-btn pf-btn-primary pf-btn-lg own-save" disabled={saving || !name.trim()} onClick={() => void save()}>
              {saving ? <Loader2 size={16} className="pe-spin" /> : <Check size={16} />} Save & start designing
            </button>
            <p className="own-small">Saved privately as a reusable blank. It works like any catalog product.</p>
          </aside>
        </section>
      )}
    </div>
  );
}
