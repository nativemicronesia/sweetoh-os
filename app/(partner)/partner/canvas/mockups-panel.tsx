"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Download, RefreshCw } from "lucide-react";
import { alphaBounds, composeMockup, composeSheet, MOCKUP_COLORS, MOCKUP_PRODUCTS, MOCKUP_SCENES, type MockupSceneId } from "@/lib/studio/quick-mockup";

type Design = { bitmap: ImageBitmap; widthIn: number; heightIn: number; bounds: ReturnType<typeof alphaBounds> };

/** Quick mockups of the current design on flat products. Illustrations for listings and posts, not photographs. */
export function MockupsPanel({ getDesign, name }: { getDesign: () => Promise<{ blob: Blob; widthIn: number; heightIn: number } | null>; name: string }) {
  const [design, setDesign] = useState<Design | null>(null);
  const [product, setProduct] = useState(MOCKUP_PRODUCTS[0].kind);
  const [color, setColor] = useState<string>(MOCKUP_COLORS[1].hex);
  const [scene, setScene] = useState<MockupSceneId>("lagoon");
  const [fill, setFill] = useState(true);
  const [busy, setBusy] = useState<string | null>("Preparing your design…");
  const [error, setError] = useState<string | null>(null);
  const preview = useRef<HTMLCanvasElement>(null);
  // The editor passes a new function every render; the panel must not reload the design each time.
  const latest = useRef(getDesign);
  useEffect(() => { latest.current = getDesign; });

  const load = useCallback(async () => {
    setBusy("Preparing your design…");
    setError(null);
    try {
      const file = await latest.current();
      if (!file) throw new Error("Add something to your design first.");
      const bitmap = await createImageBitmap(file.blob);
      setDesign({ bitmap, widthIn: file.widthIn, heightIn: file.heightIn, bounds: alphaBounds(bitmap) });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t prepare the design.");
    } finally {
      setBusy(null);
    }
  }, []);
  useEffect(() => { queueMicrotask(() => void load()); }, [load]);

  const input = useCallback((extra?: { size?: number }) => design && ({
    design: design.bitmap, aspect: design.bitmap.width / design.bitmap.height, sizeIn: { width: design.widthIn, height: design.heightIn }, ...(fill && design.bounds ? { crop: design.bounds } : {}), color, scene, ...extra,
  }), [design, color, scene, fill]);

  useEffect(() => {
    const base = input({ size: 720 });
    const item = MOCKUP_PRODUCTS.find((p) => p.kind === product);
    if (!base || !item || !preview.current) return;
    let live = true;
    void composeMockup({ ...base, product: item }).then((canvas) => {
      const target = preview.current;
      if (!live || !target) return;
      target.width = canvas.width;
      target.height = canvas.height;
      target.getContext("2d")!.drawImage(canvas, 0, 0);
    }).catch(() => setError("Couldn’t draw the mockup."));
    return () => { live = false; };
  }, [input, product]);

  async function save(kind: "one" | "sheet") {
    const base = input(kind === "one" ? { size: 2000 } : undefined);
    const item = MOCKUP_PRODUCTS.find((p) => p.kind === product);
    if (!base || !item) return;
    setBusy("Making the file…");
    try {
      const canvas = kind === "one" ? await composeMockup({ ...base, product: item }) : await composeSheet(base);
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
      if (!blob) throw new Error("Couldn’t save the mockup.");
      const link = document.createElement("a");
      const label = MOCKUP_COLORS.find((c) => c.hex === color)?.name ?? "color";
      link.download = `${name.trim().replace(/[^\w-]+/g, "-") || "design"}-${kind === "sheet" ? "mockup-sheet" : `${item.name}-${label}`.toLowerCase().replace(/\s+/g, "-")}.png`;
      link.href = URL.createObjectURL(blob);
      link.click();
      setTimeout(() => URL.revokeObjectURL(link.href), 10_000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t save the mockup.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="pe-panel-body mk">
      <div className="mk-stage">
        <canvas ref={preview} className="mk-canvas" aria-label="Mockup preview" />
        {busy && <p className="mk-busy" role="status">{busy}</p>}
      </div>
      {error && <p className="pe-error" role="alert">{error}</p>}
      <p className="pe-label">Product</p>
      <div className="pe-seg" role="group" aria-label="Product">
        {MOCKUP_PRODUCTS.map((p) => <button key={p.kind} aria-pressed={product === p.kind} onClick={() => setProduct(p.kind)}>{p.name}</button>)}
      </div>
      <p className="pe-label">Color</p>
      <div className="pe-swatches" role="group" aria-label="Product color">
        {MOCKUP_COLORS.map((c) => <button key={c.hex} type="button" aria-label={c.name} aria-pressed={color === c.hex} title={c.name} style={{ background: c.hex }} onClick={() => setColor(c.hex)} />)}
      </div>
      <button type="button" className="pe-btn pe-btn-ghost pe-block" aria-pressed={fill} onClick={() => setFill((value) => !value)}>{fill ? "Filling the print area with your artwork" : "Showing the whole artboard"}</button>
      <p className="pe-label">Scene</p>
      <div className="pe-seg" role="group" aria-label="Scene">
        {MOCKUP_SCENES.map((s) => <button key={s.id} aria-pressed={scene === s.id} onClick={() => setScene(s.id)}>{s.name}</button>)}
      </div>
      <div className="pe-row">
        <button className="pe-btn pe-btn-primary pe-grow" disabled={!design || Boolean(busy)} onClick={() => void save("one")}><Download size={15} /> Download</button>
        <button className="pe-btn pe-btn-ghost pe-grow" disabled={!design || Boolean(busy)} onClick={() => void save("sheet")}>All products</button>
        <button className="pe-icon-btn" aria-label="Refresh from design" title="Refresh from design" disabled={Boolean(busy)} onClick={() => void load()}><RefreshCw size={15} /></button>
      </div>
      <p className="pe-muted pe-small">Quick illustrations at real print scale, good for listings and posts. Order a sample before you sell, and use your print provider&apos;s photos where they offer them.</p>
    </div>
  );
}
