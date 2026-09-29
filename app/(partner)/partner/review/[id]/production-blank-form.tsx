"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { attachProductionSurfaceAction } from "../../actions/production-surface";
import { CONFIRMED_SHOP_METHODS } from "@/lib/domains/production/methods";

export function ProductionBlankForm({ productId, productName, positions }: { productId: string; productName: string; positions: string[] }) {
  const [result, action, pending] = useActionState(attachProductionSurfaceAction, {});
  const [preview, setPreview] = useState("");
  const [ratio, setRatio] = useState(1);
  const previewUrl = useRef<string | null>(null);
  const [area, setArea] = useState({ x: "", y: "", width: "", height: "" });
  useEffect(() => () => { if (previewUrl.current) URL.revokeObjectURL(previewUrl.current); }, []);
  function chooseFile(next: File | null) {
    if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
    previewUrl.current = null;
    if (!next) { setPreview(""); return; }
    const url = URL.createObjectURL(next);
    previewUrl.current = url;
    setPreview(url);
    const image = new Image();
    image.onload = () => { if (image.naturalWidth && image.naturalHeight) setRatio(image.naturalWidth / image.naturalHeight); };
    image.src = url;
  }
  const numbers = Object.values(area).map(Number);
  const showArea = numbers.length === 4 && Object.values(area).every(value => value !== "")
    && numbers.every(value => Number.isFinite(value) && value >= 0 && value <= 100)
    && numbers[0] + numbers[2] <= 100 && numbers[1] + numbers[3] <= 100;
  return <details className="mt-4 rounded-lg border p-4" style={{ borderColor: "var(--so-border)" }}>
    <summary className="cursor-pointer text-sm font-semibold" style={{ color: "var(--so-cream)" }}>Attach a production blank to this product</summary>
    <p className="mt-2 max-w-3xl text-sm" style={{ color: "var(--so-cream-dim)" }}>Upload a transparent PNG cutout of the undecorated item you actually produce. Supplier, model, lifestyle and marketing photos cannot be used as production blanks. Confirm the product identity, choose how this region is made, then enter its printable bounds and physical size. Nothing is inferred.</p>
    <form action={action} className="mt-4 grid gap-4 lg:grid-cols-[minmax(260px,420px)_minmax(280px,1fr)]">
      <input type="hidden" name="productId" value={productId}/>
      <div className="space-y-3">
        <label className="grid gap-1 text-sm">Transparent blank PNG<input type="file" name="photo" accept="image/png" required onChange={e => chooseFile(e.currentTarget.files?.[0] ?? null)}/></label>
        <p className="text-xs" style={{ color: "var(--so-cream-dim)" }}>Preview is only a reference. The image is saved as a private product asset, never as reusable artwork.</p>
        <div className="flex aspect-square items-center justify-center overflow-hidden rounded-lg border bg-[conic-gradient(#eee_25%,transparent_0_50%,#eee_0_75%,transparent_0)] bg-[length:24px_24px]" style={{ borderColor: "var(--so-border)" }}>
          {preview ? <div className="relative max-h-full max-w-full" style={{ aspectRatio: ratio, width: ratio >= 1 ? "100%" : "auto", height: ratio >= 1 ? "auto" : "100%" }}><img src={preview} alt={`${productName} blank preview`} className="absolute inset-0 h-full w-full object-fill"/><svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" aria-label="Partner-entered printable area preview" preserveAspectRatio="none">{showArea && <rect x={numbers[0]} y={numbers[1]} width={numbers[2]} height={numbers[3]} fill="#42a66a30" stroke="#126b3e" strokeWidth=".8" strokeDasharray="2 1"/>}</svg></div> : <div className="flex h-full items-center justify-center p-6 text-center text-sm" style={{ color: "var(--so-cream-dim)" }}>Choose the actual transparent production blank to preview its print placement.</div>}
        </div>
      </div>
      <div className="grid content-start gap-3">
        <label className="grid gap-1 text-sm">Surface name<input name="surfaceName" required maxLength={60} defaultValue="Front" className="rounded border bg-transparent p-2"/></label>
        <label className="grid gap-1 text-sm">Product view<select name="position" required defaultValue="front" className="rounded border bg-transparent p-2">{[...new Set(["front", "back", "left", "right", ...positions])].map(value => <option key={value} value={value}>{value.replaceAll("_", " ").replace(/^./, c => c.toUpperCase())}</option>)}</select></label>
        <label className="grid gap-1 text-sm">Printable region name<input name="regionName" required maxLength={60} defaultValue="Print area" className="rounded border bg-transparent p-2"/></label>
        <label className="grid gap-1 text-sm">Production method<select name="productionMethod" required defaultValue="" className="rounded border bg-transparent p-2"><option value="" disabled>Choose the method used for this area</option>{CONFIRMED_SHOP_METHODS.map(method => <option key={method} value={method}>{method === "sublimation" ? "Sublimation" : "Engraving"}</option>)}</select><span className="text-xs" style={{ color: "var(--so-cream-dim)" }}>Choose the real method you use for this product area.</span></label>
        <fieldset className="grid grid-cols-2 gap-2"><legend className="mb-1 text-sm">Printable bounds on the preview (%)</legend>{(["x", "y", "width", "height"] as const).map(key => <label key={key} className="grid gap-1 text-xs capitalize">{key}<input name={`area${key[0].toUpperCase()}${key.slice(1)}`} type="number" min="0.1" max="100" step="0.1" required value={area[key]} onChange={event => setArea(value => ({ ...value, [key]: event.target.value }))} className="rounded border bg-transparent p-2 text-sm"/></label>)}</fieldset>
        <label className="grid gap-1 text-sm">Physical print width<input name="printWidth" type="number" min="0.01" max="1200" step="0.01" required className="rounded border bg-transparent p-2"/></label>
        <label className="grid gap-1 text-sm">Physical print height<input name="printHeight" type="number" min="0.01" max="1200" step="0.01" required className="rounded border bg-transparent p-2"/></label>
        <label className="grid gap-1 text-sm">Units<select name="dimensionUnit" required defaultValue="in" className="rounded border bg-transparent p-2"><option value="in">Inches</option><option value="cm">Centimeters</option></select></label>
        <label className="flex items-start gap-2 text-sm"><input type="checkbox" name="confirmBlank" required className="mt-1"/><span>I confirm this is a transparent clean blank of the real undecorated {productName} I produce—not a lifestyle, model, catalog or marketing image—and that these print bounds and physical dimensions match my selected production method.</span></label>
        {result.error && <p role="alert" className="text-sm text-red-400">{result.error}</p>}
        {result.ok && <p role="status" className="text-sm text-green-400">Production surface saved. The product workspace has been refreshed.</p>}
        <button className="so-btn-primary" type="submit" disabled={pending}>{pending ? "Saving…" : "Save confirmed production surface"}</button>
      </div>
    </form>
  </details>;
}
