"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type CanvasText = { value: string; x: number; y: number; size: number; color: string };

export type CanvasTransform = {
  text?: CanvasText;
  offsetX: number;
  offsetY: number;
  scale: number;
  rotation: number;
  canvasSize: number;
};

export type CanvasPrintArea = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type Props = {
  studioSidebar?: React.ReactNode;
  studioSaveOptions?: React.ReactNode;
  blankUrl: string | null;
  designUrl: string | null;
  blankLabel: string;
  designLabel: string;
  /** Called with a PNG blob when the user exports, plus the placement used. */
  onExport: (
    blob: Blob,
    suggestedName: string,
    transform: CanvasTransform,
  ) => void | Promise<void>;
  exportLabel?: string;
  /** Partner dark desk vs storefront light chrome. */
  tone?: "light" | "dark";
  /** Reopen a previously-saved composition at this exact placement. */
  initialTransform?: Pick<CanvasTransform, "offsetX" | "offsetY" | "scale" | "rotation" | "text"> | null;
  /**
   * This blank's saved print-safe rectangle (fractions 0-1 of the canvas).
   * A fresh composition (no initialTransform) auto-fits the design inside
   * it; always drawn as a guide when present.
   */
  printArea?: CanvasPrintArea | null;
  /** Lets the partner draw/save a new print area for this blank. */
  onSavePrintArea?: (area: CanvasPrintArea) => void | Promise<void>;
};

const CANVAS_SIZE = 720;
const DEFAULT_OFFSET = { x: CANVAS_SIZE * 0.25, y: CANVAS_SIZE * 0.25 };
const DEFAULT_SCALE = 0.45;

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load ${url}`));
    img.src = url;
  });
}

/** Contain-fit `w x h` inside a `boxW x boxH` box, centered. */
function fitInsideBox(
  w: number,
  h: number,
  boxX: number,
  boxY: number,
  boxW: number,
  boxH: number,
) {
  const fit = Math.min(boxW / w, boxH / h);
  const fw = w * fit;
  const fh = h * fit;
  return {
    scale: fit,
    offsetX: boxX + (boxW - fw) / 2,
    offsetY: boxY + (boxH - fh) / 2,
  };
}

/**
 * Printify-style placer: blank as the stage, design as a draggable /
 * scalable / rotatable layer. Export flattens to PNG for library or Studio,
 * and reports the placement so it can be persisted and reopened later.
 */
export function DesignCanvas({
  blankUrl,
  designUrl,
  blankLabel,
  designLabel,
  onExport,
  exportLabel = "Save composition",
  tone = "light",
  initialTransform = null,
  printArea = null,
  onSavePrintArea,
  studioSidebar,
  studioSaveOptions,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textInput = useRef<HTMLInputElement>(null);
  const [textEditing, setTextEditing] = useState(Boolean(initialTransform?.text?.value));
  const dragTarget = useRef<"artwork" | "text">("artwork");
  const [textLayer, setTextLayer] = useState<CanvasText>(initialTransform?.text ?? { value: "", x: 360, y: 420, size: 44, color: "#193d28" });
  const [offset, setOffset] = useState(
    initialTransform
      ? { x: initialTransform.offsetX, y: initialTransform.offsetY }
      : DEFAULT_OFFSET,
  );
  const [scale, setScale] = useState(initialTransform?.scale ?? DEFAULT_SCALE);
  const [rotation, setRotation] = useState(initialTransform?.rotation ?? 0);
  const [dragging, setDragging] = useState(false);
  const dragOrigin = useRef({ x: 0, y: 0, ox: 0, oy: 0 });
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const imagesRef = useRef<{ blank: HTMLImageElement | null; design: HTMLImageElement | null }>({
    blank: null,
    design: null,
  });

  type Snapshot = { offset: { x: number; y: number }; scale: number; rotation: number; text: CanvasText };
  const history = useRef<Snapshot[]>([]);
  const [undoCount, setUndoCount] = useState(0);
  function checkpoint() {
    const snapshot = { offset: { ...offset }, scale, rotation, text: { ...textLayer } };
    if (JSON.stringify(history.current.at(-1)) !== JSON.stringify(snapshot)) {
      history.current = [...history.current.slice(-39), snapshot];
      setUndoCount(history.current.length);
    }
  }
  function undo() {
    const prior = history.current.pop();
    if (!prior) return;
    setOffset(prior.offset); setScale(prior.scale); setRotation(prior.rotation); setTextLayer(prior.text);
    setUndoCount(history.current.length);
  }
  // Print-area editing (independent of design placement).
  const [editingArea, setEditingArea] = useState(false);
  const [areaDraft, setAreaDraft] = useState<CanvasPrintArea | null>(printArea);
  const [savingArea, setSavingArea] = useState(false);
  const areaDragStart = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    setAreaDraft(printArea);
  }, [printArea]);

  const muted = tone === "dark" ? "text-[color:var(--so-cream-dim)]" : "text-neutral-600";
  const border =
    tone === "dark"
      ? "border-[color:var(--so-border)] bg-[color:var(--so-dark)]"
      : "border-neutral-200 bg-neutral-50";
  const btnSecondary =
    tone === "dark"
      ? "border-[color:var(--so-border)] text-[color:var(--so-cream-dim)]"
      : "border-neutral-300 text-neutral-700";
  const exportBtn =
    tone === "dark"
      ? { background: "var(--so-gold)", color: "var(--so-ink)" }
      : { background: "#171717", color: "#fff" };

  const redraw = useCallback((includeGuides = true) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    ctx.fillStyle = "#f4f4f5";
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    const blank = imagesRef.current.blank;
    if (blank) {
      const fit = Math.min(CANVAS_SIZE / blank.width, CANVAS_SIZE / blank.height);
      const w = blank.width * fit;
      const h = blank.height * fit;
      ctx.drawImage(blank, (CANVAS_SIZE - w) / 2, (CANVAS_SIZE - h) / 2, w, h);
    }

    const design = imagesRef.current.design;
    if (design) {
      const w = design.width * scale;
      const h = design.height * scale;
      const cx = offset.x + w / 2;
      const cy = offset.y + h / 2;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.drawImage(design, -w / 2, -h / 2, w, h);
      ctx.restore();
    }

    if (textLayer.value) {
      ctx.save();
      ctx.font = `bold ${textLayer.size}px sans-serif`;
      ctx.fillStyle = textLayer.color;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(textLayer.value, textLayer.x, textLayer.y);
      ctx.restore();
    }

    // Guides are editor-only, never part of the exported product image.
    if (areaDraft && includeGuides) {
      ctx.save();
      ctx.strokeStyle = editingArea ? "#e11d48" : "rgba(201,168,76,0.85)";
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 5]);
      ctx.strokeRect(
        areaDraft.x * CANVAS_SIZE,
        areaDraft.y * CANVAS_SIZE,
        areaDraft.width * CANVAS_SIZE,
        areaDraft.height * CANVAS_SIZE,
      );
      ctx.restore();
    }
  }, [offset.x, offset.y, scale, rotation, areaDraft, editingArea, textLayer]);

  useEffect(() => {
    let cancelled = false;
    setReady(false);
    setError(null);

    (async () => {
      try {
        imagesRef.current.blank = blankUrl ? await loadImage(blankUrl) : null;
        imagesRef.current.design = designUrl ? await loadImage(designUrl) : null;
        if (cancelled) return;

        // Fresh composition (no saved transform) on a blank with a known
        // print area: auto-fit the design there instead of the generic
        // centered default.
        const design = imagesRef.current.design;
        if (!initialTransform && printArea && design) {
          const fitted = fitInsideBox(
            design.width,
            design.height,
            printArea.x * CANVAS_SIZE,
            printArea.y * CANVAS_SIZE,
            printArea.width * CANVAS_SIZE,
            printArea.height * CANVAS_SIZE,
          );
          setScale(fitted.scale);
          setOffset({ x: fitted.offsetX, y: fitted.offsetY });
          setRotation(0);
        }

        setReady(true);
        redraw();
        // eslint-disable-next-line react-hooks/exhaustive-deps
      } catch {
        if (!cancelled) {
          setError("Couldn't load images for the canvas (signed URLs may have expired).");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // Re-run only when the images themselves change — placement defaults
    // shouldn't reset on every prop identity change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blankUrl, designUrl]);

  useEffect(() => {
    if (ready) redraw();
  }, [ready, redraw]);

  function canvasPoint(event: React.PointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * CANVAS_SIZE,
      y: ((event.clientY - rect.top) / rect.height) * CANVAS_SIZE,
    };
  }

  function onPointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
    const point = canvasPoint(event);
    event.currentTarget.setPointerCapture(event.pointerId);

    if (editingArea) {
      areaDragStart.current = { x: point.x / CANVAS_SIZE, y: point.y / CANVAS_SIZE };
      setAreaDraft({ x: areaDragStart.current.x, y: areaDragStart.current.y, width: 0, height: 0 });
      return;
    }

    const ctx = canvasRef.current?.getContext("2d");
    if (ctx) ctx.font = `bold ${textLayer.size}px sans-serif`;
    const textWidth = ctx?.measureText(textLayer.value).width ?? 0;
    const hitText = Boolean(textLayer.value) && Math.abs(point.x - textLayer.x) <= textWidth / 2 + 12 && Math.abs(point.y - textLayer.y) <= textLayer.size / 2 + 12;
    if (!hitText && !imagesRef.current.design) return;
    dragTarget.current = hitText ? "text" : "artwork";
    if (hitText) setTextEditing(true);
    checkpoint(); setDragging(true);
    dragOrigin.current = { x: point.x, y: point.y, ox: hitText ? textLayer.x : offset.x, oy: hitText ? textLayer.y : offset.y };
  }

  function onPointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
    const point = canvasPoint(event);

    if (editingArea) {
      if (!areaDragStart.current) return;
      const start = areaDragStart.current;
      const cur = { x: point.x / CANVAS_SIZE, y: point.y / CANVAS_SIZE };
      setAreaDraft({
        x: Math.min(start.x, cur.x),
        y: Math.min(start.y, cur.y),
        width: Math.abs(cur.x - start.x),
        height: Math.abs(cur.y - start.y),
      });
      return;
    }

    if (!dragging) return;
    if (dragTarget.current === "text") {
      setTextLayer(previous => ({ ...previous, x: Math.max(0, Math.min(720, dragOrigin.current.ox + point.x - dragOrigin.current.x)), y: Math.max(0, Math.min(720, dragOrigin.current.oy + point.y - dragOrigin.current.y)) }));
      return;
    }
    setOffset({
      x: dragOrigin.current.ox + (point.x - dragOrigin.current.x),
      y: dragOrigin.current.oy + (point.y - dragOrigin.current.y),
    });
  }

  function onPointerUp(event: React.PointerEvent<HTMLCanvasElement>) {
    setDragging(false);
    areaDragStart.current = null;
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // ignore
    }
  }

  async function handleExport() {
    const canvas = canvasRef.current;
    if (!canvas || !ready) return;
    setExporting(true);
    setError(null);
    try {
      redraw(false);
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob((b) => resolve(b), "image/png"),
      );
      if (!blob) {
        setError("Export failed.");
        return;
      }
      const suggested = `${blankLabel}-x-${designLabel}`
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 60);
      await onExport(blob, suggested || "composition", {
        offsetX: offset.x,
        offsetY: offset.y,
        scale,
        rotation,
        canvasSize: CANVAS_SIZE,
        text: textLayer,
      });
    } catch {
      setError("Couldn’t save the composition. Please try again.");
    } finally {
      redraw(true);
      setExporting(false);
    }
  }

  async function handleSaveArea() {
    if (!areaDraft || !onSavePrintArea) return;
    if (areaDraft.width < 0.02 || areaDraft.height < 0.02) {
      setError("Drag out a print area first — that box is too small.");
      return;
    }
    setSavingArea(true);
    setError(null);
    try {
      await onSavePrintArea(areaDraft);
      setEditingArea(false);
    } catch {
      setError("Couldn't save the print area.");
    } finally {
      setSavingArea(false);
    }
  }

  return (
    <div className={studioSidebar ? "studio-editor easy-editor" : "space-y-4"}>
      {studioSidebar}
      {studioSidebar && <div className="studio-canvas-toolbar"><span>PRODUCT PREVIEW</span><button type="button" onClick={undo} disabled={!undoCount || editingArea}>↶ Undo</button><span>Drag your design to move it</span></div>}
      <div className={`studio-canvas-stage overflow-hidden rounded-xl border ${border}`}>
        {!ready && <p role="status" className="studio-canvas-loading">Loading your product preview…</p> }
        <canvas
          aria-label="Product design canvas"
          ref={canvasRef}
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          className="mx-auto block w-full max-w-xl touch-none cursor-grab active:cursor-grabbing"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        />
      </div>


      <div className={studioSidebar ? "studio-inspector" : "space-y-4"}>
      {studioSidebar && !textEditing && <button type="button" className="easy-add-button" onClick={() => { checkpoint(); setTextEditing(true); setTextLayer(previous => ({ ...previous, value: previous.value || "Your text" })); setTimeout(() => { textInput.current?.focus(); textInput.current?.select(); }, 0); }}>＋ Add text</button>}
      {tone === "dark" && (!studioSidebar || textEditing) && <fieldset onFocusCapture={checkpoint} onPointerDownCapture={checkpoint} className="studio-text-controls grid gap-3 rounded-xl border border-[var(--so-border)] p-4 sm:grid-cols-2">
        <legend className="px-2 text-sm font-medium">Personalize with text</legend>
        <label className="text-sm sm:col-span-2">Your text<input ref={textInput} value={textLayer.value} maxLength={120} onChange={e => setTextLayer({ ...textLayer, value: e.target.value })} placeholder="A name, a birthday, your own words…" className="mt-1 w-full rounded-lg border border-[var(--so-border)] bg-white p-2" /></label>
        <details className="studio-optional w-full sm:col-span-2"><summary>Text size, color & position</summary><div className="mt-3 space-y-3">
        <label className="text-sm">Size<input type="range" min="12" max="120" value={textLayer.size} onChange={e => setTextLayer({ ...textLayer, size: Number(e.target.value) })} className="ml-2" /></label>
        <label className="text-sm">Color<input type="color" value={textLayer.color} onChange={e => setTextLayer({ ...textLayer, color: e.target.value })} className="ml-2" /></label>
        <label className="text-sm">Left / right<input type="range" min="0" max="720" value={textLayer.x} onChange={e => setTextLayer({ ...textLayer, x: Number(e.target.value) })} className="ml-2" /></label>
        <label className="text-sm">Up / down<input type="range" min="0" max="720" value={textLayer.y} onChange={e => setTextLayer({ ...textLayer, y: Number(e.target.value) })} className="ml-2" /></label>
        </div></details>
        {studioSidebar && <button type="button" className="easy-remove-text" onClick={() => { checkpoint(); setTextLayer(previous => ({ ...previous, value: "" })); setTextEditing(false); }}>Remove text</button>}
      </fieldset>}
      <div className="studio-placement-controls flex flex-wrap items-center gap-4" onFocusCapture={checkpoint} onPointerDownCapture={checkpoint}>
        <details hidden={Boolean(studioSidebar) && !designUrl} open={studioSidebar ? undefined : true} className="studio-optional w-full"><summary>Resize or rotate artwork</summary><div className="mt-3 flex flex-wrap gap-4">

        <label className={`flex items-center gap-2 text-sm ${muted}`}>
          Size
          <input
            type="range"
            min={0.15}
            max={1.2}
            step={0.01}
            value={scale}
            disabled={editingArea}
            onChange={(event) => setScale(Number(event.target.value))}
            className="w-36"
          />
        </label>
        <label className={`flex items-center gap-2 text-sm ${muted}`}>
          Rotate
          <input
            type="range"
            min={-180}
            max={180}
            step={1}
            value={rotation}
            disabled={editingArea}
            onChange={(event) => setRotation(Number(event.target.value))}
            className="w-36"
          />
          <span className="w-10 tabular-nums text-xs">{rotation}°</span>
        </label>
        <button
          type="button"
          disabled={editingArea}
          onClick={() => setRotation((prev) => ((prev + 90 + 180) % 360) - 180)}
          className={`rounded-lg border px-3 py-1.5 text-xs disabled:opacity-40 ${btnSecondary}`}
        >
          +90°
        </button>
        <button
          type="button"
          disabled={editingArea}
          onClick={() => {
            if (printArea && imagesRef.current.design) {
              const fitted = fitInsideBox(
                imagesRef.current.design.width,
                imagesRef.current.design.height,
                printArea.x * CANVAS_SIZE,
                printArea.y * CANVAS_SIZE,
                printArea.width * CANVAS_SIZE,
                printArea.height * CANVAS_SIZE,
              );
              setScale(fitted.scale);
              setOffset({ x: fitted.offsetX, y: fitted.offsetY });
            } else {
              setOffset(DEFAULT_OFFSET);
              setScale(DEFAULT_SCALE);
            }
            setRotation(0);
          }}
          className={`rounded-lg border px-3 py-1.5 text-xs disabled:opacity-40 ${btnSecondary}`}
        >
          Reset
        </button>
        </div></details>
        {studioSaveOptions}
        <button
          type="button"
          onClick={handleExport}
          disabled={!ready || (!designUrl && !(studioSidebar && textLayer.value.trim())) || exporting || editingArea}
          className="rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
          style={exportBtn}
        >
          {exporting ? "Saving…" : exportLabel}
        </button>
      </div>

      </div>
      {onSavePrintArea ? (
        <details className={`studio-print-controls easy-print-options rounded-lg border px-3 py-2 ${btnSecondary}`}><summary>Print setup (optional)</summary><div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setEditingArea((v) => !v)}
            className="rounded-lg border px-3 py-1.5 text-xs"
            style={
              editingArea
                ? { background: "#e11d48", color: "#fff", borderColor: "#e11d48" }
                : undefined
            }
          >
            {editingArea ? "Cancel" : printArea ? "Redo print area" : "Set print area"}
          </button>
          {editingArea ? (
            <>
              <span className={`text-xs ${muted}`}>
                Drag on the canvas to mark where the print sits on this blank.
              </span>
              <button
                type="button"
                onClick={handleSaveArea}
                disabled={savingArea}
                className="rounded-lg px-3 py-1.5 text-xs font-medium disabled:opacity-50"
                style={exportBtn}
              >
                {savingArea ? "Saving…" : "Save print area"}
              </button>
            </>
          ) : null}
        </div></details>
      ) : null}

      {studioSidebar && !designUrl && !textLayer.value && <p className="easy-start-hint">Start with Upload artwork or Add text. Then drag it onto your product.</p>}
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      <p className={`studio-canvas-hint text-xs ${muted}`}>
        {studioSidebar ? "Your work stays private until you publish." : "Drag to place. Size and Rotate to fit."}
      </p>
    </div>
  );
}
