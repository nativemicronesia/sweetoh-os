"use client";

import { useEffect, useRef, useState } from "react";
import {
  Canvas,
  StaticCanvas,
  FabricImage,
  FabricObject,
  IText,
  Rect,
  Point,
} from "fabric";
import { CreationSteps } from "../components/creation-steps";
import {
  uploadCanvasArtworkAction,
  generateArtworkAction,
  uploadSurfaceAction,
} from "../actions/builder";
import {
  saveCanvasCompositionAction,
  saveBlankSurfacesAction,
} from "../actions/library";
import {
  defaultArea,
  type StudioLayout,
  type StudioLayer,
  type StudioSurface,
} from "@/lib/domains/catalog/studio-layout";
import { tintGarment } from "@/lib/studio/tint";
import type { CatalogSource, VariantOptions } from "@/lib/domains/catalog/variants";
type CanvasPrintArea = StudioSurface["area"];
type LegacyTransform = {
  offsetX: number;
  offsetY: number;
  scale: number;
  rotation: number;
  text?: { value: string; x: number; y: number; size: number; color: string };
};

export type CanvasBlankOption = {
  id: string;
  name: string;
  imageUrl: string | null;
  printArea: (CanvasPrintArea & { surfaces?: StudioSurface[] }) | null;
  variantOptions?: VariantOptions | null;
  catalogSource?: CatalogSource | null;
};
export type CanvasDesignOption = {
  id: string;
  name: string;
  previewUrl: string | null;
};
type Surface = StudioLayout["surfaces"][number];
type Props = {
  blanks: CanvasBlankOption[];
  designs: CanvasDesignOption[];
  initialDesignId: string | null;
  initialBlankId?: string | null;
  initialTransform?: LegacyTransform | null;
  initialStudio?: StudioLayout | null;
  surfaceImages?: Record<string, string>;
};
const size = 720;

export function PartnerCanvasClient({
  blanks,
  designs,
  initialDesignId,
  initialBlankId,
  initialTransform,
  initialStudio,
  surfaceImages = {},
}: Props) {
  const blank = blanks.find((b) => b.id === initialBlankId) ?? blanks[0];
  const [library, setLibrary] = useState(designs);
  const urls = useRef<Record<string, string>>({
    ...surfaceImages,
    ...Object.fromEntries(
      designs.filter((d) => d.previewUrl).map((d) => [d.id, d.previewUrl!]),
    ),
  });
  const initial = useRef<StudioLayout>(
    initialStudio ?? {
      version: 1,
      surfaces: (
        blank?.printArea?.surfaces ?? [
          {
            id: "front",
            name: "Front",
            assetId: null,
            area: blank?.printArea ?? defaultArea,
          },
        ]
      ).map((s) => ({ ...s, layers: [] })),
    },
  );
  const documentRef = useRef<StudioLayout>(structuredClone(initial.current));
  const [surfaces, setSurfaces] = useState(documentRef.current.surfaces);
  const [surfaceId, setSurfaceId] = useState(surfaces[0].id);
  const currentId = useRef(surfaceId);
  const host = useRef<HTMLDivElement>(null);
  const editor = useRef<Canvas | null>(null);
  const guide = useRef<Rect | null>(null);
  const metadata = useRef(new WeakMap<FabricObject, StudioLayer>());
  const history = useRef<StudioLayout[]>([]);
  const [undoCount, setUndoCount] = useState(0);
  const [selected, setSelected] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [name, setName] = useState(blank?.name ?? "My product");
  const [preview, setPreview] = useState<
    { name: string; url: string }[] | null
  >(null);
  const colors = blank?.variantOptions?.colors ?? [];
  const [colorName, setColorName] = useState<string | null>(colors[0]?.name ?? null);
  const colorRef = useRef<string | null>(colors[0]?.hex ?? null);
  const tinted = useRef(new Map<string, Promise<string | null>>());
  const [colorPreview, setColorPreview] = useState<
    { color: string; hex: string; url: string }[]
  >([]);
  const [areaEditing, setAreaEditing] = useState(false);
  const [surfaceName, setSurfaceName] = useState("");
  const [brief, setBrief] = useState("");
  const [layers, setLayers] = useState<StudioLayer[]>([]);
  const booted = useRef(false);
  const [activeText, setActiveText] = useState<string | null>(null);
  const uploadInput = useRef<HTMLInputElement>(null);
  const surfaceInput = useRef<HTMLInputElement>(null);
  const dirty = useRef(false);
  const isLocked = busy || !ready;

  function capture() {
    const canvas = editor.current;
    if (!canvas) return;
    const surface = documentRef.current.surfaces.find(
      (s) => s.id === currentId.current,
    )!;
    surface.layers = canvas
      .getObjects()
      .filter((o) => metadata.current.has(o))
      .map((o) => {
        const base = metadata.current.get(o)!;
        return {
          ...base,
          x: o.left,
          y: o.top,
          scaleX: o.scaleX,
          scaleY: o.scaleY,
          angle: o.angle,
          ...(o instanceof IText
            ? { text: o.text, color: String(o.fill), fontSize: o.fontSize }
            : {}),
        } as StudioLayer;
      });
    setLayers([...surface.layers]);
  }
  function checkpoint() {
    capture();
    history.current = [
      ...history.current.slice(-29),
      structuredClone(documentRef.current),
    ];
    setUndoCount(history.current.length);
    dirty.current = true;
  }
  function selection() {
    const o = editor.current?.getActiveObject();
    setSelected(Boolean(o && o !== guide.current));
    setActiveText(o instanceof IText ? o.text : null);
  }
  async function makeLayer(layer: StudioLayer) {
    const obj =
      layer.kind === "image"
        ? await FabricImage.fromURL(urls.current[layer.assetId], {
            crossOrigin: "anonymous",
          })
        : new IText(layer.text, {
            fontSize: layer.fontSize,
            fill: layer.color,
            fontFamily: "Arial",
            fontWeight: "bold",
          });
    obj.set({
      left: layer.x,
      top: layer.y,
      scaleX: layer.scaleX,
      scaleY: layer.scaleY,
      angle: layer.angle,
      cornerColor: "#287964",
      cornerStyle: "circle",
      transparentCorners: false,
      borderColor: "#287964",
      padding: 5,
    });
    metadata.current.set(obj, layer);
    return obj;
  }
  /** The blank photo recolored to a garment color; null keeps the original. */
  function recolored(src: string, hex: string | null, area: CanvasPrintArea) {
    if (!hex || /^#f[a-f0-9]f[a-f0-9]f[a-f0-9]$/i.test(hex)) return Promise.resolve(null);
    const key = `${src}|${hex}`;
    if (!tinted.current.has(key))
      tinted.current.set(
        key,
        tintGarment(src, hex, { x: area.x + area.width / 2, y: area.y + area.height / 2 })
          .then((r) => r?.url ?? null)
          .catch(() => null),
      );
    return tinted.current.get(key)!;
  }
  async function paint(
    canvas: StaticCanvas,
    surface: Surface,
    withGuide = false,
    hex: string | null = colorRef.current,
  ) {
    canvas.clear();
    canvas.backgroundColor = "#faf8f2";
    const original = surface.assetId
      ? urls.current[surface.assetId]
      : blank?.imageUrl;
    if (!original)
      throw new Error(
        "This surface photo is unavailable. Refresh or upload it again.",
      );
    const source = (await recolored(original, hex, surface.area)) ?? original;
    const image = await FabricImage.fromURL(source, {
      crossOrigin: "anonymous",
    });
    // A Strict Mode remount may finish an old image request after a new canvas starts.
    if (withGuide && canvas !== editor.current) return;
    const ratio = Math.min(size / image.width, size / image.height);
    image.set({
      left: (size - image.width * ratio) / 2,
      top: (size - image.height * ratio) / 2,
      scaleX: ratio,
      scaleY: ratio,
    });
    canvas.backgroundImage = image;
    for (const layer of surface.layers) {
      const object = await makeLayer(layer);
      if (withGuide && canvas !== editor.current) return;
      canvas.add(object);
    }
    if (withGuide) {
      const a = surface.area;
      const rect = new Rect({
        left: a.x * size,
        top: a.y * size,
        width: a.width * size,
        height: a.height * size,
        fill: "transparent",
        stroke: "#287964",
        strokeWidth: 1.5,
        strokeDashArray: [7, 5],
        selectable: false,
        evented: false,
        excludeFromExport: true,
        lockRotation: true,
        cornerColor: "#287964",
        transparentCorners: false,
      });
      guide.current = rect;
      canvas.add(rect);
    }
    canvas.renderAll();
  }
  async function loadSurface(id: string) {
    setReady(false);
    setError("");
    setAreaEditing(false);
    currentId.current = id;
    setSurfaceId(id);
    setSelected(false);
    setActiveText(null);
    const canvas = editor.current!;
    try {
      await paint(
        canvas,
        documentRef.current.surfaces.find((s) => s.id === id)!,
        true,
      );
      if (editor.current !== canvas) return;
      setLayers([
        ...documentRef.current.surfaces.find((s) => s.id === id)!.layers,
      ]);
      setReady(true);
    } catch (e) {
      if (editor.current === canvas)
        setError(
          e instanceof Error ? e.message : "Couldn’t load this surface.",
        );
    }
  }
  useEffect(() => {
    let disposed = false;
    const element = document.createElement("canvas");
    host.current!.appendChild(element);
    const canvas = new Canvas(element, {
      width: size,
      height: size,
      preserveObjectStacking: true,
      selection: false,
    });
    editor.current = canvas;
    const resize = new ResizeObserver((entries) => {
      const width = Math.min(size, entries[0].contentRect.width);
      if (width <= 0) return;
      canvas.setDimensions(
        { width: `${width}px`, height: `${width}px` },
        { cssOnly: true },
      );
    });
    resize.observe(host.current!);
    canvas.on("selection:created", selection);
    canvas.on("selection:updated", selection);
    canvas.on("selection:cleared", selection);
    canvas.on("before:transform", () => checkpoint());
    canvas.on("text:editing:entered", () => checkpoint());
    canvas.on("object:modified", () => {
      capture();
      dirty.current = true;
    });
    canvas.on("text:changed", () => {
      capture();
      selection();
      dirty.current = true;
    });
    (async () => {
      try {
        if (
          !booted.current &&
          !initialStudio &&
          initialDesignId &&
          urls.current[initialDesignId]
        ) {
          const img = await FabricImage.fromURL(urls.current[initialDesignId], {
            crossOrigin: "anonymous",
          });
          if (disposed) return;
          const a = documentRef.current.surfaces[0].area;
          const scale =
            initialTransform?.scale ??
            Math.min(
              (a.width * size) / img.width,
              (a.height * size) / img.height,
            );
          documentRef.current.surfaces[0].layers.push({
            id: crypto.randomUUID(),
            kind: "image",
            assetId: initialDesignId,
            x:
              initialTransform?.offsetX ??
              a.x * size + (a.width * size - img.width * scale) / 2,
            y:
              initialTransform?.offsetY ??
              a.y * size + (a.height * size - img.height * scale) / 2,
            scaleX: scale,
            scaleY: scale,
            angle: initialTransform?.rotation ?? 0,
          });
        }
        if (
          !booted.current &&
          !initialStudio &&
          initialTransform?.text?.value
        ) {
          const t = initialTransform.text;
          documentRef.current.surfaces[0].layers.push({
            id: crypto.randomUUID(),
            kind: "text",
            text: t.value,
            x: t.x - t.value.length * t.size * 0.25,
            y: t.y - t.size / 2,
            fontSize: t.size,
            color: t.color,
            scaleX: 1,
            scaleY: 1,
            angle: 0,
          });
        }
        booted.current = true;
        if (!disposed) await loadSurface(currentId.current);
      } catch {
        if (!disposed)
          setError("Couldn’t load your design. Refresh to try again.");
      }
    })();
    const leave = (e: BeforeUnloadEvent) => {
      if (dirty.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", leave);
    return () => {
      disposed = true;
      if (editor.current === canvas) editor.current = null;
      resize.disconnect();
      window.removeEventListener("beforeunload", leave);
      void canvas.dispose();
    };
    // This editor owns its document; uploads update its library without remounting.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function addArtwork(id: string) {
    if (isLocked) return;
    setBusy(true);
    setError("");
    checkpoint();
    try {
      const image = await FabricImage.fromURL(urls.current[id], {
        crossOrigin: "anonymous",
      });
      const a = documentRef.current.surfaces.find(
        (s) => s.id === currentId.current,
      )!.area;
      const scale =
        Math.min(
          (a.width * size) / image.width,
          (a.height * size) / image.height,
        ) * 0.8;
      const layer: StudioLayer = {
        id: crypto.randomUUID(),
        kind: "image",
        assetId: id,
        x: a.x * size + (a.width * size - image.width * scale) / 2,
        y: a.y * size + (a.height * size - image.height * scale) / 2,
        scaleX: scale,
        scaleY: scale,
        angle: 0,
      };
      const obj = await makeLayer(layer);
      editor.current!.add(obj);
      editor.current!.setActiveObject(obj);
      editor.current!.requestRenderAll();
      capture();
    } catch {
      setError("Couldn’t add this artwork. Please try again.");
    } finally {
      setBusy(false);
    }
  }
  async function upload(file: File | undefined, ai = false) {
    if (!file && !ai) return;
    setBusy(true);
    setError("");
    try {
      const form = new FormData();
      if (file) form.set("artwork", file);
      const result = ai
        ? await generateArtworkAction(brief)
        : await uploadCanvasArtworkAction(form);
      if (result.error || !result.assetId || !result.previewUrl)
        throw new Error(result.error || "Couldn’t upload artwork.");
      urls.current[result.assetId] = result.previewUrl;
      setLibrary((items) => [
        {
          id: result.assetId!,
          name: result.name || file?.name || "New artwork",
          previewUrl: result.previewUrl!,
        },
        ...items,
      ]);
      setBusy(false);
      await addArtwork(result.assetId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t add artwork.");
    } finally {
      setBusy(false);
    }
  }
  function addText() {
    checkpoint();
    const layer: StudioLayer = {
      id: crypto.randomUUID(),
      kind: "text",
      text: "Your text",
      x: 240,
      y: 320,
      scaleX: 1,
      scaleY: 1,
      angle: 0,
      fontSize: 44,
      color: "#235c48",
    };
    void makeLayer(layer).then((obj) => {
      editor.current!.add(obj);
      editor.current!.setActiveObject(obj);
      capture();
      editor.current!.requestRenderAll();
    });
  }
  async function duplicate() {
    const obj = editor.current?.getActiveObject();
    if (!obj || obj === guide.current) return;
    checkpoint();
    const source = documentRef.current.surfaces
      .find((s) => s.id === currentId.current)!
      .layers.find((l) => l.id === metadata.current.get(obj)?.id)!;
    const copy = await makeLayer({
      ...source,
      id: crypto.randomUUID(),
      x: source.x + 20,
      y: source.y + 20,
    });
    editor.current!.add(copy);
    editor.current!.setActiveObject(copy);
    capture();
    editor.current!.requestRenderAll();
  }
  function changeSelected(change: (obj: FabricObject) => void) {
    const o = editor.current?.getActiveObject();
    if (!o || o === guide.current) return;
    checkpoint();
    change(o);
    o.setCoords();
    capture();
    editor.current!.requestRenderAll();
    selection();
  }
  async function undo() {
    const previous = history.current.pop();
    if (!previous) return;
    documentRef.current = previous;
    setSurfaces([...previous.surfaces]);
    setUndoCount(history.current.length);
    await loadSurface(
      previous.surfaces.some((s) => s.id === currentId.current)
        ? currentId.current
        : previous.surfaces[0].id,
    );
  }
  async function addSurface(file?: File) {
    if (!surfaceName.trim()) return;
    setBusy(true);
    setError("");
    try {
      let assetId: string | null = null;
      if (file) {
        const data = new FormData();
        data.set("photo", file);
        const result = await uploadSurfaceAction(data);
        if (result.error || !result.assetId || !result.previewUrl)
          throw new Error(result.error || "Upload failed.");
        assetId = result.assetId;
        urls.current[assetId] = result.previewUrl;
      }
      checkpoint();
      const s: Surface = {
        id: crypto.randomUUID(),
        name: surfaceName.trim(),
        assetId,
        area: { ...defaultArea },
        layers: [],
      };
      documentRef.current.surfaces.push(s);
      setSurfaces([...documentRef.current.surfaces]);
      setSurfaceName("");
      await loadSurface(s.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t add surface.");
    } finally {
      setBusy(false);
    }
  }
  async function saveArea() {
    const r = guide.current;
    if (!r) return;
    const area = {
      x: r.left / size,
      y: r.top / size,
      width: (r.width * r.scaleX) / size,
      height: (r.height * r.scaleY) / size,
    };
    if (
      area.x < 0 ||
      area.y < 0 ||
      area.width < 0.02 ||
      area.height < 0.02 ||
      area.x + area.width > 1.001 ||
      area.y + area.height > 1.001
    ) {
      setError(
        "Keep the print area inside the image and at least a small rectangle.",
      );
      return;
    }
    setBusy(true);
    setError("");
    try {
      documentRef.current.surfaces.find(
        (s) => s.id === currentId.current,
      )!.area = area;
      const result = await saveBlankSurfacesAction(
        blank.id,
        documentRef.current.surfaces.map(({ layers, ...s }) => s),
      );
      if (result.error) throw new Error(result.error);
      r.set({ selectable: false, evented: false });
      editor.current!.discardActiveObject();
      setAreaEditing(false);
      editor.current!.requestRenderAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t save print area.");
    } finally {
      setBusy(false);
    }
  }
  async function showPreview() {
    setBusy(true);
    setError("");
    capture();
    try {
      const previews = [];
      for (const s of documentRef.current.surfaces) {
        const canvas = new StaticCanvas(document.createElement("canvas"), {
          width: size,
          height: size,
        });
        try {
          await paint(canvas, s);
          previews.push({
            name: s.name,
            url: canvas.toDataURL({ format: "png", multiplier: 1 }),
          });
        } finally {
          await canvas.dispose();
        }
      }
      setPreview(previews);
      const front = documentRef.current.surfaces[0];
      const perColor = [];
      for (const c of colors) {
        const canvas = new StaticCanvas(document.createElement("canvas"), {
          width: size,
          height: size,
        });
        try {
          await paint(canvas, front, false, c.hex);
          perColor.push({
            color: c.name,
            hex: c.hex,
            url: canvas.toDataURL({ format: "jpeg", quality: 0.88, multiplier: 1 }),
          });
        } finally {
          await canvas.dispose();
        }
      }
      setColorPreview(perColor);
    } catch {
      setError(
        "Couldn’t prepare preview. Check that each surface photo is available.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function downloadPrint(surfaceIndex: number) {
    setBusy(true);
    setError("");
    const surface = documentRef.current.surfaces[surfaceIndex];
    const canvas = new StaticCanvas(document.createElement("canvas"), { width: size, height: size });
    try {
      for (const layer of surface.layers) canvas.add(await makeLayer(layer));
      const area = surface.area;
      // Export at the product's real print size when the catalog provides it.
      const areas = blank?.catalogSource?.printAreas ?? [];
      const spec =
        areas.find((a) => surface.name.toLowerCase().includes(a.position.replace(/_/g, " "))) ??
        (surfaceIndex === 0 ? areas.find((a) => a.position === "front") : undefined);
      // Artwork and text re-render at full resolution, so only the output size is capped.
      const multiplier = spec
        ? Math.min(spec.width, 6000) / (area.width * size)
        : 4;
      const link = document.createElement("a");
      link.download = `${name || blank.name}-${surface.name}-print.png`;
      link.href = canvas.toDataURL({ format: "png", multiplier, left: area.x * size, top: area.y * size, width: area.width * size, height: area.height * size });
      link.click();
    } catch { setError("Couldn’t export this print file. Try again."); }
    finally { await canvas.dispose(); setBusy(false); }
  }

  async function save(product: boolean) {
    if (!preview) return;
    setBusy(true);
    setError("");
    try {
      const form = new FormData();
      form.set("name", name.trim() || blank.name);
      form.set("saveAsProduct", String(product));
      form.set("blankProductId", blank.id);
      form.set("studioLayout", JSON.stringify(documentRef.current));
      for (let i = 0; i < preview.length; i++) {
        const blob = await (await fetch(preview[i].url)).blob();
        form.append(
          i === 0 ? "file" : "surfaceFiles",
          new File([blob], `${preview[i].name}.png`, { type: "image/png" }),
        );
      }
      for (const c of colorPreview) {
        const blob = await (await fetch(c.url)).blob();
        form.append("colorFiles", new File([blob], `${c.color}.jpg`, { type: "image/jpeg" }));
      }
      dirty.current = false;
      const result = await saveCanvasCompositionAction(form);
      if (result?.error) throw new Error(result.error);
    } catch (e) {
      dirty.current = true;
      setError(
        e instanceof Error
          ? e.message
          : "Couldn’t save. Your design is still here.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="print-studio">
      <CreationSteps current={preview ? 3 : 2} />
      <header className="studio-page-heading">
        <div>
          <h1>{preview ? "Preview your product" : "Design Studio"}</h1>
          <p>
            {blank.name} ·{" "}
            {preview
              ? "Check each surface before adding your listing details."
              : "Add artwork. Drag the corners to resize, or the top handle to rotate."}
          </p>
        </div>
        <div className="print-header-actions">
          {preview ? (
            <button
              className="so-btn-ghost"
              disabled={busy}
              onClick={() => setPreview(null)}
            >
              ← Back to design
            </button>
          ) : (
            <button
              className="studio-primary"
              disabled={
                isLocked ||
                areaEditing ||
                !documentRef.current.surfaces.some((s) => s.layers.length)
              }
              onClick={showPreview}
            >
              Preview product →
            </button>
          )}
        </div>
      </header>
      {!ready && !error && <p role="status" className="easy-help">Loading your product…</p>}
      {error && (
        <p role="alert" className="print-error">
          {error}
        </p>
      )}
      {busy && (
        <p role="status" className="easy-help">
          Working… your design stays here.
        </p>
      )}
      <div hidden={Boolean(preview)} className="print-workspace">
        <aside className="print-library">
          <h2>Artwork library</h2>
          <input
            ref={uploadInput}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="sr-only"
            aria-label="Upload artwork file"
            disabled={isLocked || areaEditing}
            onChange={(e) => {
              void upload(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          <button
            className="easy-add-button"
            disabled={isLocked || areaEditing}
            onClick={() => uploadInput.current?.click()}
          >
            ＋ Upload artwork
          </button>
          <button
            className="easy-add-button"
            disabled={isLocked || areaEditing}
            onClick={addText}
          >
            ＋ Add text
          </button>
          <input
            className="print-search"
            aria-label="Search artwork"
            placeholder="Search saved artwork"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="studio-artwork-grid">
            {library
              .filter((d) =>
                d.name.toLowerCase().includes(search.toLowerCase()),
              )
              .map((d) => (
                <button
                  disabled={isLocked || areaEditing || !d.previewUrl}
                  key={d.id}
                  title={`Add ${d.name}`}
                  onClick={() => void addArtwork(d.id)}
                >
                  {d.previewUrl && <img src={d.previewUrl} alt="" />}
                  <small>{d.name}</small>
                </button>
              ))}
          </div>
          {!library.length && (
            <p className="easy-help">
              Upload your first design. It will be here for your next product,
              too.
            </p>
          )}
          <details className="studio-optional">
            <summary>Create artwork with AI</summary>
            <label className="studio-field">
              Describe artwork
              <textarea
                value={brief}
                onChange={(e) => setBrief(e.target.value)}
                maxLength={2000}
              />
            </label>
            <button
              className="so-btn-ghost"
              disabled={isLocked || areaEditing || brief.trim().length < 8}
              onClick={() => void upload(undefined, true)}
            >
              Generate artwork
            </button>
            <p className="easy-help">Uses AI only when you click Generate.</p>
          </details>
        </aside>
        <section className="print-design">
          {colors.length > 0 && (
            <div className="color-bar" role="group" aria-label="Preview color">
              <span>Color</span>
              {colors.map((c) => (
                <button
                  key={c.name}
                  type="button"
                  className="swatch"
                  title={c.name}
                  aria-label={c.name}
                  aria-pressed={colorName === c.name}
                  disabled={isLocked || areaEditing}
                  style={{ background: c.hex }}
                  onClick={() => {
                    if (colorName === c.name) return;
                    capture();
                    colorRef.current = c.hex;
                    setColorName(c.name);
                    void loadSurface(currentId.current);
                  }}
                />
              ))}
              <small>{colorName}</small>
            </div>
          )}
          <div className="print-surface-tabs" aria-label="Product surfaces">
            {surfaces.map((s) => (
              <button
                key={s.id}
                aria-pressed={surfaceId === s.id}
                disabled={isLocked || areaEditing}
                onClick={() => {
                  capture();
                  void loadSurface(s.id);
                }}
              >
                {s.name}
              </button>
            ))}
          </div>
          <div className="print-toolbar">
            <button
              disabled={isLocked || !undoCount || areaEditing}
              onClick={() => void undo()}
            >
              ↶ Undo
            </button>
            <button
              disabled={isLocked || !selected || areaEditing}
              onClick={() => void duplicate()}
            >
              Duplicate
            </button>
            <button
              disabled={isLocked || !selected || areaEditing}
              onClick={() =>
                changeSelected((o) => {
                  const a = documentRef.current.surfaces.find(
                    (s) => s.id === currentId.current,
                  )!.area;
                  o.setPositionByOrigin(
                    new Point((a.x + a.width / 2) * size, o.getCenterPoint().y),
                    "center",
                    "center",
                  );
                })
              }
            >
              Align center
            </button>
            <button
              disabled={isLocked || !selected || areaEditing}
              onClick={() =>
                changeSelected((o) => {
                  const a = documentRef.current.surfaces.find(
                    (s) => s.id === currentId.current,
                  )!.area;
                  o.setPositionByOrigin(
                    new Point(
                      o.getCenterPoint().x,
                      (a.y + a.height / 2) * size,
                    ),
                    "center",
                    "center",
                  );
                })
              }
            >
              Align middle
            </button>
            <button
              disabled={isLocked || !selected || areaEditing}
              onClick={() => changeSelected((o) => editor.current!.remove(o))}
            >
              Remove
            </button>
          </div>
          <div className="print-canvas-shell">
            <div
              ref={host}
              className="print-canvas"
              aria-label="Product design canvas"
            />
            {!ready && <p role="status">Loading your product…</p>}
          </div>
          <p className="easy-help">
            Dashed line = print area. It won’t appear in your mockups.
          </p>
          <div className="print-selection">
            {activeText !== null && (
              <label className="studio-field">
                Your text
                <input
                  aria-label="Your text"
                  value={activeText}
                  maxLength={120}
                  onChange={(e) =>
                    changeSelected((o) => {
                      if (o instanceof IText) o.set("text", e.target.value);
                    })
                  }
                />
              </label>
            )}
            {activeText !== null && (
              <label>Text color<input aria-label="Text color" type="color" value={String(editor.current?.getActiveObject()?.fill ?? "#235c48")} onChange={event => changeSelected(object => object.set("fill", event.target.value))} /></label>
            )}
            {selected && (
              <>
                <label>
                  Size{" "}
                  <input
                    aria-label="Artwork size"
                    type="range"
                    min="10"
                    max="650"
                    value={Math.round(
                      editor.current?.getActiveObject()?.getScaledWidth() ??
                        100,
                    )}
                    onPointerDown={() => checkpoint()}
                    onChange={(e) => {
                      const o = editor.current?.getActiveObject();
                      if (!o) return;
                      o.scaleToWidth(Number(e.target.value));
                      o.setCoords();
                      capture();
                      editor.current!.requestRenderAll();
                    }}
                  />
                </label>
                <label>
                  Rotate{" "}
                  <input
                    aria-label="Artwork rotation"
                    type="range"
                    min="-180"
                    max="180"
                    value={editor.current?.getActiveObject()?.angle ?? 0}
                    onChange={(e) =>
                      changeSelected((o) => o.rotate(Number(e.target.value)))
                    }
                  />
                </label>
              </>
            )}
          </div>
        </section>
        <aside className="print-product-tools">
          <h2>Product surfaces</h2>
          <p className="easy-help">
            Set the printable area for each view of your product.
          </p>
          <button
            className="easy-add-button"
            disabled={isLocked}
            onClick={() => {
              if (areaEditing) {
                void saveArea();
                return;
              }
              checkpoint();
              setAreaEditing(true);
              guide.current!.set({ selectable: true, evented: true });
              editor.current!.setActiveObject(guide.current!);
              editor.current!.requestRenderAll();
            }}
          >
            {areaEditing ? "Save print area" : "Adjust print area"}
          </button>
          {areaEditing && (
            <p className="easy-help">
              Drag or resize the dashed rectangle, then save.
            </p>
          )}
          <details className="studio-optional">
            <summary>＋ Add surface / print area</summary>
            <label className="studio-field">
              Surface name
              <input
                maxLength={60}
                value={surfaceName}
                onChange={(e) => setSurfaceName(e.target.value)}
                placeholder="Back, sleeve, handle…"
              />
            </label>
            <input
              ref={surfaceInput}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="sr-only"
              aria-label="Surface photo"
              disabled={isLocked || areaEditing}
              onChange={(e) => {
                void addSurface(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
            <button
              className="so-btn-ghost"
              disabled={
                isLocked ||
                areaEditing ||
                !surfaceName.trim() ||
                surfaces.length >= 12
              }
              onClick={() => surfaceInput.current?.click()}
            >
              Upload this view
            </button>
            <button
              className="so-btn-ghost"
              disabled={
                isLocked ||
                areaEditing ||
                !surfaceName.trim() ||
                surfaces.length >= 12
              }
              onClick={() => void addSurface()}
            >
              Use same product photo
            </button>
            <p className="easy-help">
              Upload a back or side photo, or define another area on this image.
            </p>
          </details>
          <h2>On this surface</h2>
          <div className="print-layer-list">
            {layers.map((l, i) => (
              <button
                key={l.id}
                disabled={isLocked || areaEditing}
                onClick={() => {
                  const o = editor
                    .current!.getObjects()
                    .find((o) => metadata.current.get(o)?.id === l.id);
                  if (o) {
                    editor.current!.setActiveObject(o);
                    editor.current!.requestRenderAll();
                  }
                }}
              >
                {i + 1}.{" "}
                {l.kind === "text"
                  ? l.text
                  : library.find((d) => d.id === l.assetId)?.name || "Artwork"}
              </button>
            ))}
          </div>
          {!layers.length && (
            <p className="easy-help">Click artwork on the left to add it.</p>
          )}
        </aside>
      </div>
      {preview && (
        <section className="print-preview">
          <div className="print-preview-grid">
            {preview.map((p, i) => (
              <figure key={i}>
                <img src={p.url} alt={`${name} — ${p.name} mockup`} />
                <figcaption>{p.name}</figcaption>
                <button className="so-btn-ghost" disabled={busy} onClick={() => void downloadPrint(i)}>Download print file</button>
              </figure>
            ))}
          </div>
          {colorPreview.length > 1 && (
            <div className="color-previews">
              <h3>All colors</h3>
              <div>
                {colorPreview.map((c) => (
                  <figure key={c.color}>
                    <img src={c.url} alt={`${name} — ${c.color}`} />
                    <figcaption>
                      <span className="swatch" style={{ background: c.hex }} /> {c.color}
                    </figcaption>
                  </figure>
                ))}
              </div>
            </div>
          )}
          <div className="print-preview-footer">
            <label className="studio-field">
              Product name
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={180}
              />
            </label>
            <button
              disabled={busy}
              className="so-btn-ghost"
              onClick={() => void save(false)}
            >
              Save design to library
            </button>
            <button
              disabled={busy}
              className="studio-primary"
              onClick={() => void save(true)}
            >
              Continue to details & pricing →
            </button>
          </div>
          <p className="easy-help">
            Your product stays private until you publish. Print files contain artwork on a transparent background, cropped to your print area. Set the physical size in your print software.
          </p>
        </section>
      )}
    </div>
  );
}
