"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Canvas,
  StaticCanvas,
  FabricImage,
  FabricObject,
  IText,
  Rect,
} from "fabric";
import {
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignEndHorizontal,
  AlignEndVertical,
  AlignStartHorizontal,
  AlignStartVertical,
  ArrowLeft,
  ArrowDown,
  ArrowUp,
  Bold,
  Copy,
  Crop,
  Download,
  Eye,
  Image as ImageIcon,
  ImagePlus,
  Layers,
  Loader2,
  Maximize,
  Minus,
  Plus,
  Sparkles,
  Trash2,
  Type,
  Undo2,
  Upload,
  X,
} from "lucide-react";
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
import type { CatalogSource, VariantOptions } from "@/lib/domains/catalog/variants";
import { analyzePhoto, printAreaInBox, tintGarment } from "@/lib/studio/tint";
import { PRODUCT_FONTS, ensureFont, fontFamily } from "@/lib/studio/fonts";

type Area = StudioSurface["area"];
type Surface = StudioLayout["surfaces"][number];
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
  printArea: (Area & { surfaces?: StudioSurface[] }) | null;
  variantOptions?: VariantOptions | null;
  catalogSource?: CatalogSource | null;
};
export type CanvasDesignOption = { id: string; name: string; previewUrl: string | null };
type Props = {
  blanks: CanvasBlankOption[];
  designs: CanvasDesignOption[];
  initialDesignId: string | null;
  initialBlankId?: string | null;
  initialTransform?: LegacyTransform | null;
  initialStudio?: StudioLayout | null;
  surfaceImages?: Record<string, string>;
};
type Selected =
  | null
  | {
      kind: "image" | "text";
      name: string;
      left: number;
      top: number;
      width: number;
      height: number;
      angle: number;
      dpi: number | null;
      text?: string;
      font?: string;
      fontSize?: number;
      color?: string;
      bold?: boolean;
    };
type Panel = "files" | "text" | "ai" | "layers" | null;
type Mockup = { color: string; hex: string; url: string };
type PreviewData = { views: { name: string; url: string }[]; colors: Mockup[] };

const SIZE = 720;
const DPI = 300;
const INK = "#1f7048";
const TEXT_COLORS = ["#101828", "#ffffff", "#c8102e", "#f2a900", "#1f7048", "#2a4ea6", "#e7407c", "#7c5cc4"];
const POSITION_LABEL: Record<string, string> = {
  front: "Front",
  back: "Back",
  left_sleeve: "Left sleeve",
  right_sleeve: "Right sleeve",
  neck: "Neck label",
};

function isWhite(hex: string | null) {
  return !hex || /^#f[a-f0-9]f[a-f0-9]f[a-f0-9]$/i.test(hex);
}
function round(n: number, d = 2) {
  const f = 10 ** d;
  return Math.round(n * f) / f;
}

export function ProductEditor({
  blanks,
  designs,
  initialDesignId,
  initialBlankId,
  initialTransform,
  initialStudio,
  surfaceImages = {},
}: Props) {
  const blank = blanks.find((b) => b.id === initialBlankId) ?? blanks[0];
  const colors = blank?.variantOptions?.colors ?? [];
  const sizes = blank?.variantOptions?.sizes ?? [];
  const specs = blank?.catalogSource?.printAreas ?? [];
  const catalogPhotos = blank?.catalogSource?.images ?? [];

  const urls = useRef<Record<string, string>>({
    ...surfaceImages,
    ...Object.fromEntries(designs.filter((d) => d.previewUrl).map((d) => [d.id, d.previewUrl!])),
  });
  const initial = useRef<StudioLayout>(
    initialStudio ?? {
      version: 1,
      surfaces: (
        blank?.printArea?.surfaces ?? [
          { id: "front", name: "Front", position: "front", assetId: null, area: blank?.printArea ?? defaultArea },
        ]
      ).map((s) => ({ ...s, layers: [] })),
    },
  );
  const doc = useRef<StudioLayout>(structuredClone(initial.current));
  const [surfaces, setSurfaces] = useState(doc.current.surfaces);
  const [surfaceId, setSurfaceId] = useState(surfaces[0].id);
  const currentId = useRef(surfaceId);
  const host = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const editor = useRef<Canvas | null>(null);
  const guide = useRef<Rect | null>(null);
  const meta = useRef(new WeakMap<FabricObject, StudioLayer>());
  const history = useRef<StudioLayout[]>([]);
  const tinted = useRef(new Map<string, Promise<string | null>>());
  const mockTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const colorRef = useRef<string | null>(colors[0]?.hex ?? null);
  const booted = useRef(false);
  const dirty = useRef(false);
  const uploadInput = useRef<HTMLInputElement>(null);
  const photoInput = useRef<HTMLInputElement>(null);

  const [library, setLibrary] = useState(designs);
  const [colorName, setColorName] = useState<string | null>(colors[0]?.name ?? null);
  const [panel, setPanel] = useState<Panel>("files");
  const [zoom, setZoom] = useState(1);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [name, setName] = useState(blank?.name ?? "My product");
  const [layers, setLayers] = useState<StudioLayer[]>([]);
  const [selected, setSelected] = useState<Selected>(null);
  const [undoCount, setUndoCount] = useState(0);
  const [search, setSearch] = useState("");
  const [brief, setBrief] = useState("");
  const [areaEditing, setAreaEditing] = useState(false);
  const [outside, setOutside] = useState(false);
  const [mockups, setMockups] = useState<Mockup[]>([]);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [previewPick, setPreviewPick] = useState<{ kind: "view" | "color"; index: number }>({ kind: "view", index: 0 });
  const [viewThumbs, setViewThumbs] = useState<Record<string, string>>({});
  const [photoScores, setPhotoScores] = useState<Record<string, number>>({});
  const [viewPicker, setViewPicker] = useState<{ mode: "add" | "replace"; position: string } | null>(null);

  const surface = () => doc.current.surfaces.find((s) => s.id === currentId.current)!;
  const spec = (s: Surface = surface()) =>
    specs.find((a) => a.position === s.position) ??
    (s.id === doc.current.surfaces[0].id ? specs.find((a) => a.position === "front") : undefined);
  /** Printed inches per canvas pixel for the current view, when the real print size is known. */
  const inchesPerPx = (s: Surface = surface()) => {
    const sp = spec(s);
    return sp ? sp.width / DPI / (s.area.width * SIZE) : null;
  };
  const locked = Boolean(busy) || !ready;

  /* ---------- document <-> canvas ---------- */

  function capture() {
    const canvas = editor.current;
    if (!canvas) return;
    const s = surface();
    s.layers = canvas
      .getObjects()
      .filter((o) => meta.current.has(o))
      .map((o) => {
        const base = meta.current.get(o)!;
        return {
          ...base,
          x: o.left,
          y: o.top,
          scaleX: o.scaleX,
          scaleY: o.scaleY,
          angle: o.angle,
          ...(o instanceof IText
            ? {
                text: o.text,
                color: String(o.fill),
                fontSize: o.fontSize,
                bold: o.fontWeight === "bold" || o.fontWeight === 700,
              }
            : {}),
        } as StudioLayer;
      });
    setLayers([...s.layers]);
    checkOutside();
    scheduleMockups();
  }
  function checkpoint() {
    capture();
    history.current = [...history.current.slice(-39), structuredClone(doc.current)];
    setUndoCount(history.current.length);
    dirty.current = true;
  }
  function checkOutside() {
    const canvas = editor.current;
    if (!canvas) return;
    const a = surface().area;
    const [l, t, r, b] = [a.x * SIZE, a.y * SIZE, (a.x + a.width) * SIZE, (a.y + a.height) * SIZE];
    setOutside(
      canvas
        .getObjects()
        .filter((o) => meta.current.has(o))
        .some((o) => {
          const br = o.getBoundingRect();
          return br.left < l - 1 || br.top < t - 1 || br.left + br.width > r + 1 || br.top + br.height > b + 1;
        }),
    );
  }
  function readSelection() {
    const o = editor.current?.getActiveObject();
    if (!o || o === guide.current || !meta.current.has(o)) {
      setSelected(null);
      return;
    }
    const base = meta.current.get(o)!;
    const a = surface().area;
    const ipp = inchesPerPx();
    const unit = ipp ?? 1 / (a.width * SIZE) * 100; // inches, or % of print width
    const br = o.getBoundingRect();
    const text = o instanceof IText;
    setSelected({
      kind: text ? "text" : "image",
      name: text ? (o as IText).text.slice(0, 40) : (library.find((d) => base.kind === "image" && d.id === base.assetId)?.name ?? "Artwork"),
      left: round((br.left - a.x * SIZE) * unit),
      top: round((br.top - a.y * SIZE) * unit),
      width: round(o.getScaledWidth() * unit),
      height: round(o.getScaledHeight() * unit),
      angle: Math.round(o.angle),
      dpi: !text && ipp ? Math.round(1 / (o.scaleX * ipp)) : null,
      ...(text
        ? {
            text: (o as IText).text,
            font: base.kind === "text" ? (base.font ?? "inter") : "inter",
            fontSize: (o as IText).fontSize,
            color: String((o as IText).fill),
            bold: (o as IText).fontWeight === "bold" || (o as IText).fontWeight === 700,
          }
        : {}),
    });
  }

  async function makeLayer(layer: StudioLayer) {
    let obj: FabricObject;
    if (layer.kind === "image") {
      obj = await FabricImage.fromURL(urls.current[layer.assetId], { crossOrigin: "anonymous" });
    } else {
      const bold = layer.bold ?? true;
      await ensureFont(layer.font, bold);
      obj = new IText(layer.text, {
        fontSize: layer.fontSize,
        fill: layer.color,
        fontFamily: fontFamily(layer.font),
        fontWeight: bold ? "bold" : "normal",
      });
    }
    obj.set({
      left: layer.x,
      top: layer.y,
      scaleX: layer.scaleX,
      scaleY: layer.scaleY,
      angle: layer.angle,
      cornerColor: "#ffffff",
      cornerStrokeColor: INK,
      cornerStyle: "circle",
      cornerSize: 11,
      transparentCorners: false,
      borderColor: INK,
      borderScaleFactor: 1.5,
      padding: 4,
    });
    meta.current.set(obj, layer);
    return obj;
  }

  function photoFor(s: Surface) {
    return (s.assetId ? urls.current[s.assetId] : null) ?? s.imageUrl ?? blank?.imageUrl ?? null;
  }
  /** The view photo cleaned and recolored to a garment color; null keeps the original. */
  function recolored(src: string, hex: string | null, area: Area) {
    const target = isWhite(hex) ? "#ffffff" : hex!;
    const key = `${src}|${target}`;
    if (!tinted.current.has(key))
      tinted.current.set(
        key,
        tintGarment(src, target, { x: area.x + area.width / 2, y: area.y + area.height / 2 })
          .then((r) => r?.url ?? null)
          .catch(() => null),
      );
    return tinted.current.get(key)!;
  }

  async function paint(canvas: StaticCanvas, s: Surface, withGuide = false, hex: string | null = colorRef.current) {
    canvas.clear();
    canvas.backgroundColor = "#f4f5f7";
    const original = photoFor(s);
    if (!original) throw new Error("This view’s photo is unavailable. Choose another photo.");
    const source = (await recolored(original, hex, s.area)) ?? original;
    const image = await FabricImage.fromURL(source, { crossOrigin: "anonymous" });
    if (withGuide && canvas !== editor.current) return;
    const ratio = Math.min(SIZE / image.width, SIZE / image.height);
    image.set({
      left: (SIZE - image.width * ratio) / 2,
      top: (SIZE - image.height * ratio) / 2,
      scaleX: ratio,
      scaleY: ratio,
    });
    canvas.backgroundImage = image;
    for (const layer of s.layers) {
      const object = await makeLayer(layer);
      if (withGuide && canvas !== editor.current) return;
      canvas.add(object);
    }
    if (withGuide) {
      const a = s.area;
      const rect = new Rect({
        left: a.x * SIZE,
        top: a.y * SIZE,
        width: a.width * SIZE,
        height: a.height * SIZE,
        fill: "rgba(31,112,72,0.04)",
        stroke: INK,
        strokeWidth: 1.2,
        strokeDashArray: [6, 5],
        strokeUniform: true,
        selectable: false,
        evented: false,
        excludeFromExport: true,
        lockRotation: true,
        cornerColor: "#ffffff",
        cornerStrokeColor: INK,
        cornerStyle: "circle",
        transparentCorners: false,
        borderColor: INK,
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
    setSelected(null);
    const canvas = editor.current!;
    try {
      await paint(canvas, doc.current.surfaces.find((s) => s.id === id)!, true);
      if (editor.current !== canvas) return;
      setLayers([...surface().layers]);
      setReady(true);
      checkOutside();
      scheduleMockups(0);
    } catch (e) {
      if (editor.current === canvas) setError(e instanceof Error ? e.message : "Couldn’t load this view.");
    }
  }

  // Rank catalog photos (clean, flat, full product first) when the picker opens.
  useEffect(() => {
    if (!viewPicker || Object.keys(photoScores).length) return;
    let live = true;
    (async () => {
      const scores: Record<string, number> = {};
      for (const src of catalogPhotos.slice(0, 20)) {
        scores[src] = (await analyzePhoto(src).catch(() => ({ score: -3 }))).score;
        if (!live) return;
      }
      setPhotoScores(scores);
    })();
    return () => {
      live = false;
    };
    // catalogPhotos is fixed for this blank.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewPicker, photoScores]);

  // View tabs show each view's cleaned photo in the current color.
  useEffect(() => {
    let live = true;
    (async () => {
      const next: Record<string, string> = {};
      for (const s of surfaces) {
        const src = photoFor(s);
        if (src) next[s.id] = (await recolored(src, colorRef.current, s.area)) ?? src;
      }
      if (live) setViewThumbs(next);
    })();
    return () => {
      live = false;
    };
    // Recolored photos are cached; re-run when views or the color change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [surfaces, colorName]);

  /* ---------- live color mockups ---------- */

  const renderMockups = useCallback(async () => {
    const s = doc.current.surfaces.find((x) => x.id === currentId.current);
    if (!s) return;
    const list = colors.length ? colors.slice(0, 12) : [{ name: "", hex: "#ffffff" }];
    const out: Mockup[] = [];
    for (const c of list) {
      const canvas = new StaticCanvas(document.createElement("canvas"), { width: SIZE, height: SIZE });
      try {
        await paint(canvas, s, false, c.hex);
        out.push({ color: c.name, hex: c.hex, url: canvas.toDataURL({ format: "jpeg", quality: 0.8, multiplier: 0.3 }) });
      } catch {
        // Skip a color that can't render; the rest still show.
      } finally {
        await canvas.dispose();
      }
    }
    setMockups(out);
    // paint/colors are stable for the life of this editor.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  function scheduleMockups(delay = 700) {
    if (mockTimer.current) clearTimeout(mockTimer.current);
    mockTimer.current = setTimeout(() => void renderMockups(), delay);
  }

  /* ---------- canvas lifecycle ---------- */

  useEffect(() => {
    let disposed = false;
    const element = document.createElement("canvas");
    host.current!.appendChild(element);
    const canvas = new Canvas(element, {
      width: SIZE,
      height: SIZE,
      preserveObjectStacking: true,
      selection: false,
    });
    editor.current = canvas;
    canvas.on("selection:created", readSelection);
    canvas.on("selection:updated", readSelection);
    canvas.on("selection:cleared", readSelection);
    canvas.on("before:transform", () => checkpoint());
    canvas.on("text:editing:entered", () => checkpoint());
    canvas.on("object:modified", () => {
      capture();
      readSelection();
      dirty.current = true;
    });
    canvas.on("object:moving", () => readSelection());
    canvas.on("object:scaling", () => readSelection());
    canvas.on("object:rotating", () => readSelection());
    canvas.on("text:changed", () => {
      capture();
      readSelection();
      dirty.current = true;
    });
    (async () => {
      try {
        if (!booted.current && !initialStudio && initialDesignId && urls.current[initialDesignId]) {
          const img = await FabricImage.fromURL(urls.current[initialDesignId], { crossOrigin: "anonymous" });
          if (disposed) return;
          const a = doc.current.surfaces[0].area;
          const scale = initialTransform?.scale ?? Math.min((a.width * SIZE) / img.width, (a.height * SIZE) / img.height);
          doc.current.surfaces[0].layers.push({
            id: crypto.randomUUID(),
            kind: "image",
            assetId: initialDesignId,
            x: initialTransform?.offsetX ?? a.x * SIZE + (a.width * SIZE - img.width * scale) / 2,
            y: initialTransform?.offsetY ?? a.y * SIZE + (a.height * SIZE - img.height * scale) / 2,
            scaleX: scale,
            scaleY: scale,
            angle: initialTransform?.rotation ?? 0,
          });
        }
        if (!booted.current && !initialStudio && initialTransform?.text?.value) {
          const t = initialTransform.text;
          doc.current.surfaces[0].layers.push({
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
        if (!disposed) setError("Couldn’t load your design. Refresh to try again.");
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
      window.removeEventListener("beforeunload", leave);
      if (mockTimer.current) clearTimeout(mockTimer.current);
      void canvas.dispose();
    };
    // The editor owns its document; uploads update its library without remounting.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fit the canvas to the stage, then apply zoom.
  useEffect(() => {
    const el = stage.current;
    const canvas = editor.current;
    if (!el || !canvas) return;
    const fit = () => {
      const box = el.getBoundingClientRect();
      const side = Math.max(240, Math.min(box.width - 48, box.height - 48));
      const px = Math.round(side * zoom);
      canvas.setDimensions({ width: `${px}px`, height: `${px}px` }, { cssOnly: true });
      canvas.calcOffset();
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [zoom]);

  // Keyboard: delete, undo, nudge — never while typing.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest("input, textarea, select, [contenteditable=true]")) return;
      const o = editor.current?.getActiveObject();
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        void undo();
        return;
      }
      if (!o || !meta.current.has(o) || (o instanceof IText && o.isEditing)) return;
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        removeSelected();
      } else if (e.key.startsWith("Arrow")) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        changeSelected((obj) =>
          obj.set({
            left: obj.left + (e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0),
            top: obj.top + (e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0),
          }),
        );
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  /* ---------- adding & editing ---------- */

  async function addArtwork(id: string) {
    if (locked) return;
    setBusy("Adding artwork…");
    setError("");
    checkpoint();
    try {
      const image = await FabricImage.fromURL(urls.current[id], { crossOrigin: "anonymous" });
      const a = surface().area;
      const scale = Math.min((a.width * SIZE) / image.width, (a.height * SIZE) / image.height) * 0.9;
      const layer: StudioLayer = {
        id: crypto.randomUUID(),
        kind: "image",
        assetId: id,
        x: a.x * SIZE + (a.width * SIZE - image.width * scale) / 2,
        y: a.y * SIZE + (a.height * SIZE - image.height * scale) / 3,
        scaleX: scale,
        scaleY: scale,
        angle: 0,
      };
      const obj = await makeLayer(layer);
      editor.current!.add(obj);
      bringGuideToTop();
      editor.current!.setActiveObject(obj);
      editor.current!.requestRenderAll();
      capture();
      readSelection();
    } catch {
      setError("Couldn’t add this artwork. Please try again.");
    } finally {
      setBusy(null);
    }
  }
  async function upload(file: File | undefined, ai = false) {
    if (!file && !ai) return;
    setBusy(ai ? "Creating artwork with AI…" : "Uploading…");
    setError("");
    try {
      const form = new FormData();
      if (file) form.set("artwork", file);
      const result = ai ? await generateArtworkAction(brief) : await uploadCanvasArtworkAction(form);
      if (result.error || !result.assetId || !result.previewUrl) throw new Error(result.error || "Couldn’t upload artwork.");
      urls.current[result.assetId] = result.previewUrl;
      setLibrary((items) => [
        { id: result.assetId!, name: result.name || file?.name || "New artwork", previewUrl: result.previewUrl! },
        ...items,
      ]);
      setBusy(null);
      await addArtwork(result.assetId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t add artwork.");
    } finally {
      setBusy(null);
    }
  }
  async function addText(preset: { text: string; size: number; font?: string; bold?: boolean } = { text: "Your text", size: 48 }) {
    if (locked) return;
    checkpoint();
    const a = surface().area;
    const layer: StudioLayer = {
      id: crypto.randomUUID(),
      kind: "text",
      text: preset.text,
      x: a.x * SIZE + 10,
      y: a.y * SIZE + (a.height * SIZE) / 3,
      scaleX: 1,
      scaleY: 1,
      angle: 0,
      fontSize: preset.size,
      color: isWhite(colorRef.current) ? "#101828" : "#ffffff",
      font: preset.font ?? "inter",
      bold: preset.bold ?? true,
    };
    const obj = await makeLayer(layer);
    // Start inside the print area: shrink long text to fit its width.
    const maxW = a.width * SIZE * 0.9;
    if (obj.getScaledWidth() > maxW) obj.scale(maxW / obj.width);
    editor.current!.add(obj);
    alignSelected("hcenter", obj);
    bringGuideToTop();
    editor.current!.setActiveObject(obj);
    capture();
    readSelection();
    editor.current!.requestRenderAll();
  }
  function bringGuideToTop() {
    if (guide.current && editor.current) editor.current.bringObjectToFront(guide.current);
  }
  function changeSelected(change: (obj: FabricObject) => void, record = true) {
    const o = editor.current?.getActiveObject();
    if (!o || !meta.current.has(o)) return;
    if (record) checkpoint();
    change(o);
    o.setCoords();
    capture();
    editor.current!.requestRenderAll();
    readSelection();
  }
  function alignSelected(to: "left" | "hcenter" | "right" | "top" | "vcenter" | "bottom", target?: FabricObject) {
    const apply = (o: FabricObject) => {
      const a = surface().area;
      const br = o.getBoundingRect();
      const [l, t, w, h] = [a.x * SIZE, a.y * SIZE, a.width * SIZE, a.height * SIZE];
      const dx = to === "left" ? l - br.left : to === "hcenter" ? l + (w - br.width) / 2 - br.left : to === "right" ? l + w - br.width - br.left : 0;
      const dy = to === "top" ? t - br.top : to === "vcenter" ? t + (h - br.height) / 2 - br.top : to === "bottom" ? t + h - br.height - br.top : 0;
      o.set({ left: o.left + dx, top: o.top + dy });
      o.setCoords();
    };
    if (target) apply(target);
    else changeSelected(apply);
  }
  function fitSelected() {
    changeSelected((o) => {
      const a = surface().area;
      const s = Math.min((a.width * SIZE) / o.width, (a.height * SIZE) / o.height);
      o.set({ scaleX: s, scaleY: s, angle: 0 });
      o.setCoords();
      alignSelected("hcenter", o);
      alignSelected("top", o);
    });
  }
  /** Numeric edits from the properties panel, in inches (or % of print width). */
  function setGeometry(field: "left" | "top" | "width" | "height" | "angle", value: number) {
    if (!Number.isFinite(value)) return;
    changeSelected((o) => {
      const a = surface().area;
      const ipp = inchesPerPx();
      const toPx = (v: number) => (ipp ? v / ipp : (v / 100) * a.width * SIZE);
      if (field === "angle") o.rotate(value);
      else if (field === "width" || field === "height") {
        const px = toPx(value);
        const s = field === "width" ? px / o.width : px / o.height;
        if (s > 0) o.set({ scaleX: s, scaleY: s });
      } else {
        const br = o.getBoundingRect();
        const target = (field === "left" ? a.x : a.y) * SIZE + toPx(value);
        o.set(field === "left" ? { left: o.left + target - br.left } : { top: o.top + target - br.top });
      }
    });
  }
  async function setFont(key: string) {
    const o = editor.current?.getActiveObject();
    if (!(o instanceof IText)) return;
    const bold = o.fontWeight === "bold" || o.fontWeight === 700;
    await ensureFont(key, bold);
    changeSelected((obj) => {
      obj.set({ fontFamily: fontFamily(key) });
      const base = meta.current.get(obj);
      if (base?.kind === "text") meta.current.set(obj, { ...base, font: key });
    });
  }
  async function duplicate() {
    const o = editor.current?.getActiveObject();
    if (!o || !meta.current.has(o)) return;
    checkpoint();
    const source = surface().layers.find((l) => l.id === meta.current.get(o)?.id)!;
    const copy = await makeLayer({ ...source, id: crypto.randomUUID(), x: source.x + 16, y: source.y + 16 });
    editor.current!.add(copy);
    bringGuideToTop();
    editor.current!.setActiveObject(copy);
    capture();
    readSelection();
    editor.current!.requestRenderAll();
  }
  function removeSelected() {
    const o = editor.current?.getActiveObject();
    if (!o || !meta.current.has(o)) return;
    checkpoint();
    editor.current!.remove(o);
    editor.current!.discardActiveObject();
    capture();
    readSelection();
    editor.current!.requestRenderAll();
  }
  function reorder(dir: "up" | "down") {
    changeSelected((o) => {
      if (dir === "up") editor.current!.bringObjectForward(o);
      else editor.current!.sendObjectBackwards(o);
      bringGuideToTop();
    });
  }
  function selectLayer(id: string) {
    const o = editor.current?.getObjects().find((x) => meta.current.get(x)?.id === id);
    if (!o) return;
    editor.current!.setActiveObject(o);
    editor.current!.requestRenderAll();
    readSelection();
  }
  async function undo() {
    const previous = history.current.pop();
    if (!previous) return;
    doc.current = previous;
    setSurfaces([...previous.surfaces]);
    setUndoCount(history.current.length);
    await loadSurface(previous.surfaces.some((s) => s.id === currentId.current) ? currentId.current : previous.surfaces[0].id);
  }
  function pickColor(c: { name: string; hex: string }) {
    if (colorName === c.name || locked) return;
    capture();
    colorRef.current = c.hex;
    setColorName(c.name);
    void loadSurface(currentId.current);
  }

  /* ---------- views & print area ---------- */

  async function persistViews() {
    const result = await saveBlankSurfacesAction(
      blank.id,
      doc.current.surfaces.map((s) => ({
        id: s.id,
        name: s.name,
        assetId: s.assetId,
        imageUrl: s.imageUrl ?? null,
        position: s.position,
        area: s.area,
      })),
    );
    if (result.error) throw new Error(result.error);
  }
  /** A print area on a photo, placed on the garment when it can be found. */
  async function areaForPhoto(src: string, position: string): Promise<Area> {
    const sp = specs.find((a) => a.position === position);
    const ratio = sp ? sp.height / sp.width : 1.2;
    if (position.includes("sleeve") || position === "neck") {
      const w = 0.12;
      return { x: 0.44, y: 0.3, width: w, height: Math.min(0.3, w * ratio) };
    }
    try {
      const info = await analyzePhoto(src);
      if (info.box) {
        const img = await FabricImage.fromURL(src, { crossOrigin: "anonymous" });
        const r = Math.min(SIZE / img.width, SIZE / img.height);
        const [ox, oy, dw, dh] = [(SIZE - img.width * r) / 2, (SIZE - img.height * r) / 2, img.width * r, img.height * r];
        const a = printAreaInBox(info.box, (ratio * dw) / dh);
        return { x: (ox + a.x * dw) / SIZE, y: (oy + a.y * dh) / SIZE, width: (a.width * dw) / SIZE, height: (a.height * dh) / SIZE };
      }
    } catch {
      // fall through
    }
    return { ...defaultArea };
  }
  async function useViewPhoto(photo: { imageUrl?: string; file?: File }) {
    if (!viewPicker) return;
    setBusy("Setting up view…");
    setError("");
    try {
      let assetId: string | null = null;
      let src = photo.imageUrl ?? null;
      if (photo.file) {
        const data = new FormData();
        data.set("photo", photo.file);
        const result = await uploadSurfaceAction(data);
        if (result.error || !result.assetId || !result.previewUrl) throw new Error(result.error || "Upload failed.");
        assetId = result.assetId;
        urls.current[assetId] = result.previewUrl;
        src = result.previewUrl;
      }
      const area = await areaForPhoto(src!, viewPicker.position);
      checkpoint();
      if (viewPicker.mode === "replace") {
        const s = surface();
        s.assetId = assetId;
        s.imageUrl = assetId ? null : photo.imageUrl;
        s.area = area;
      } else {
        doc.current.surfaces.push({
          id: `${viewPicker.position}-${crypto.randomUUID().slice(0, 6)}`,
          name: POSITION_LABEL[viewPicker.position] ?? viewPicker.position,
          position: viewPicker.position,
          assetId,
          imageUrl: assetId ? null : photo.imageUrl,
          area,
          layers: [],
        });
      }
      setSurfaces([...doc.current.surfaces]);
      await persistViews();
      const id = viewPicker.mode === "replace" ? currentId.current : doc.current.surfaces.at(-1)!.id;
      setViewPicker(null);
      await loadSurface(id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t set up this view.");
    } finally {
      setBusy(null);
    }
  }
  function startAreaEdit() {
    const r = guide.current;
    if (!r || !editor.current) return;
    editor.current.discardActiveObject();
    r.set({ selectable: true, evented: true, hasRotatingPoint: false, lockRotation: true });
    r.setControlVisible("mtr", false);
    editor.current.setActiveObject(r);
    editor.current.requestRenderAll();
    setAreaEditing(true);
  }
  async function saveArea() {
    const r = guide.current;
    if (!r) return;
    const area = { x: r.left / SIZE, y: r.top / SIZE, width: (r.width * r.scaleX) / SIZE, height: (r.height * r.scaleY) / SIZE };
    if (area.x < 0 || area.y < 0 || area.width < 0.02 || area.height < 0.02 || area.x + area.width > 1.001 || area.y + area.height > 1.001) {
      setError("Keep the print area inside the photo.");
      return;
    }
    setBusy("Saving print area…");
    try {
      surface().area = area;
      await persistViews();
      r.set({ selectable: false, evented: false });
      editor.current!.discardActiveObject();
      setAreaEditing(false);
      checkOutside();
      editor.current!.requestRenderAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t save print area.");
    } finally {
      setBusy(null);
    }
  }

  /* ---------- preview, print files, save ---------- */

  async function buildPreview(): Promise<PreviewData> {
    capture();
    const views = [];
    for (const s of doc.current.surfaces) {
      if (!s.layers.length && s.id !== doc.current.surfaces[0].id) continue;
      const canvas = new StaticCanvas(document.createElement("canvas"), { width: SIZE, height: SIZE });
      try {
        await paint(canvas, s);
        views.push({ name: s.name, url: canvas.toDataURL({ format: "png", multiplier: 1 }) });
      } finally {
        await canvas.dispose();
      }
    }
    const front = doc.current.surfaces[0];
    const perColor: Mockup[] = [];
    for (const c of colors) {
      const canvas = new StaticCanvas(document.createElement("canvas"), { width: SIZE, height: SIZE });
      try {
        await paint(canvas, front, false, c.hex);
        perColor.push({ color: c.name, hex: c.hex, url: canvas.toDataURL({ format: "jpeg", quality: 0.88, multiplier: 1 }) });
      } finally {
        await canvas.dispose();
      }
    }
    return { views, colors: perColor };
  }
  async function openPreview() {
    setBusy("Rendering mockups…");
    setError("");
    try {
      setPreview(await buildPreview());
      setPreviewPick({ kind: "view", index: 0 });
    } catch {
      setError("Couldn’t prepare the preview. Check each view’s photo.");
    } finally {
      setBusy(null);
    }
  }
  async function downloadPrint(s: Surface) {
    setBusy("Exporting print file…");
    const canvas = new StaticCanvas(document.createElement("canvas"), { width: SIZE, height: SIZE });
    try {
      for (const layer of s.layers) canvas.add(await makeLayer(layer));
      const a = s.area;
      const sp = spec(s);
      // Artwork re-renders at full resolution, so only the output size is capped.
      const multiplier = sp ? Math.min(sp.width, 6000) / (a.width * SIZE) : 4;
      const link = document.createElement("a");
      link.download = `${name || blank.name}-${s.name}-print.png`;
      link.href = canvas.toDataURL({ format: "png", multiplier, left: a.x * SIZE, top: a.y * SIZE, width: a.width * SIZE, height: a.height * SIZE });
      link.click();
    } catch {
      setError("Couldn’t export this print file. Try again.");
    } finally {
      await canvas.dispose();
      setBusy(null);
    }
  }
  async function save(asProduct: boolean) {
    setBusy(asProduct ? "Preparing your product…" : "Saving to My files…");
    setError("");
    try {
      const data = preview ?? (await buildPreview());
      const form = new FormData();
      form.set("name", name.trim() || blank.name);
      form.set("saveAsProduct", String(asProduct));
      form.set("blankProductId", blank.id);
      form.set("studioLayout", JSON.stringify(doc.current));
      for (let i = 0; i < data.views.length; i++) {
        const blob = await (await fetch(data.views[i].url)).blob();
        form.append(i === 0 ? "file" : "surfaceFiles", new File([blob], `${data.views[i].name}.png`, { type: "image/png" }));
      }
      for (const c of data.colors) {
        const blob = await (await fetch(c.url)).blob();
        form.append("colorFiles", new File([blob], `${c.color}.jpg`, { type: "image/jpeg" }));
      }
      dirty.current = false;
      const result = await saveCanvasCompositionAction(form);
      if (result?.error) throw new Error(result.error);
    } catch (e) {
      dirty.current = true;
      setError(e instanceof Error ? e.message : "Couldn’t save. Your design is still here.");
    } finally {
      setBusy(null);
    }
  }

  /* ---------- render ---------- */

  const current = surfaces.find((s) => s.id === surfaceId) ?? surfaces[0];
  const currentSpec = spec(current);
  const hasDesign = surfaces.some((s) => s.layers.length) || layers.length > 0;
  const usedPositions = new Set(surfaces.map((s) => s.position ?? ""));
  const order = ["front", "back", "left_sleeve", "right_sleeve", "neck"];
  const addablePositions = specs
    .map((a) => a.position)
    .filter((p) => !usedPositions.has(p))
    .sort((a, b) => (order.indexOf(a) + 99) % 99 - (order.indexOf(b) + 99) % 99);
  const unit = currentSpec ? "in" : "%";
  const visibleLibrary = library.filter((d) => d.name.toLowerCase().includes(search.trim().toLowerCase()));
  const previewImage =
    preview && (previewPick.kind === "view" ? preview.views[previewPick.index]?.url : preview.colors[previewPick.index]?.url);

  return (
    <div className="pe">
      <header className="pe-top">
        <Link href="/partner/catalog" className="pe-icon-btn" aria-label="Back to catalog" title="Back to catalog">
          <ArrowLeft size={18} />
        </Link>
        <div className="pe-title">
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={180} aria-label="Product name" />
          <span>{blank.catalogSource ? [blank.catalogSource.brand, blank.catalogSource.model].filter(Boolean).join(" ") : blank.name}</span>
        </div>
        <div className="pe-top-actions">
          <button className="pe-icon-btn" onClick={() => void undo()} disabled={!undoCount || locked} aria-label="Undo" title="Undo (⌘Z)">
            <Undo2 size={17} />
          </button>
          <button className="pe-btn pe-btn-ghost" onClick={() => void save(false)} disabled={!hasDesign || locked}>
            Save to My files
          </button>
          <button className="pe-btn pe-btn-ghost" onClick={() => void openPreview()} disabled={!hasDesign || locked}>
            <Eye size={16} /> Preview
          </button>
          <button className="pe-btn pe-btn-primary" onClick={() => void save(true)} disabled={!hasDesign || locked}>
            Continue to pricing
          </button>
        </div>
      </header>

      <div className="pe-body">
        <nav className="pe-rail" aria-label="Design tools">
          {(
            [
              ["files", Upload, "Uploads"],
              ["text", Type, "Text"],
              ["ai", Sparkles, "AI art"],
              ["layers", Layers, "Layers"],
            ] as const
          ).map(([key, Icon, label]) => (
            <button key={key} aria-pressed={panel === key} onClick={() => setPanel(panel === key ? null : key)}>
              <Icon size={20} />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        {panel && (
          <aside className="pe-panel">
            <div className="pe-panel-head">
              <h2>{panel === "files" ? "Uploads" : panel === "text" ? "Text" : panel === "ai" ? "Create with AI" : "Layers"}</h2>
              <button className="pe-icon-btn" aria-label="Close panel" onClick={() => setPanel(null)}>
                <X size={16} />
              </button>
            </div>

            {panel === "files" && (
              <div className="pe-panel-body">
                <input
                  ref={uploadInput}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="sr-only"
                  aria-label="Upload artwork file"
                  onChange={(e) => {
                    void upload(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
                <button className="pe-drop" disabled={locked} onClick={() => uploadInput.current?.click()}>
                  <ImagePlus size={22} />
                  <strong>Upload artwork</strong>
                  <span>PNG with a transparent background prints best</span>
                </button>
                <input className="pe-search" placeholder="Search your files" value={search} onChange={(e) => setSearch(e.target.value)} />
                <div className="pe-files">
                  {visibleLibrary.map((d) => (
                    <button key={d.id} title={d.name} disabled={locked || !d.previewUrl} onClick={() => void addArtwork(d.id)}>
                      {d.previewUrl ? <img src={d.previewUrl} alt="" loading="lazy" /> : <ImageIcon size={20} />}
                      <span>{d.name}</span>
                    </button>
                  ))}
                </div>
                {!visibleLibrary.length && <p className="pe-muted">{search ? "No files match." : "Your uploads appear here."}</p>}
              </div>
            )}

            {panel === "text" && (
              <div className="pe-panel-body">
                <button className="pe-text-preset pe-text-h" disabled={locked} onClick={() => void addText({ text: "Add a heading", size: 64, font: "anton", bold: false })}>
                  Add a heading
                </button>
                <button className="pe-text-preset pe-text-s" disabled={locked} onClick={() => void addText({ text: "Add a subheading", size: 40, font: "montserrat" })}>
                  Add a subheading
                </button>
                <button className="pe-text-preset pe-text-b" disabled={locked} onClick={() => void addText({ text: "Add body text", size: 28, font: "inter", bold: false })}>
                  Add body text
                </button>
                <p className="pe-label">Font styles</p>
                <div className="pe-fonts">
                  {PRODUCT_FONTS.map((f) => (
                    <button key={f.key} disabled={locked} style={{ fontFamily: f.family }} onClick={() => void addText({ text: f.label, size: 52, font: f.key, bold: f.bold })}>
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {panel === "ai" && (
              <div className="pe-panel-body">
                <p className="pe-muted">Describe the artwork. It’s added to your design and saved to your files.</p>
                <textarea className="pe-textarea" rows={5} value={brief} onChange={(e) => setBrief(e.target.value)} placeholder="e.g. hibiscus flowers and ocean waves, bold outline, transparent background" />
                <button className="pe-btn pe-btn-primary pe-block" disabled={locked || brief.trim().length < 8} onClick={() => void upload(undefined, true)}>
                  <Sparkles size={16} /> Generate artwork
                </button>
                <p className="pe-muted pe-small">Uses AI only when you click Generate.</p>
              </div>
            )}

            {panel === "layers" && (
              <div className="pe-panel-body">
                {layers.length ? (
                  <ul className="pe-layers">
                    {[...layers].reverse().map((l) => (
                      <li key={l.id}>
                        <button onClick={() => selectLayer(l.id)}>
                          {l.kind === "text" ? <Type size={16} /> : urls.current[l.assetId] ? <img src={urls.current[l.assetId]} alt="" /> : <ImageIcon size={16} />}
                          <span>{l.kind === "text" ? l.text : (library.find((d) => d.id === l.assetId)?.name ?? "Artwork")}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="pe-muted">Nothing on this view yet. Upload artwork or add text.</p>
                )}
              </div>
            )}
          </aside>
        )}

        <main className="pe-stage-wrap">
          <div className="pe-stage" ref={stage}>
            <div className="pe-canvas" ref={host} />
            {!ready && !error && (
              <div className="pe-loading">
                <Loader2 size={22} className="pe-spin" /> Loading product…
              </div>
            )}
            <div className="pe-zoom">
              <button onClick={() => setZoom((z) => Math.max(0.5, round(z - 0.25)))} aria-label="Zoom out">
                <Minus size={15} />
              </button>
              <span>{Math.round(zoom * 100)}%</span>
              <button onClick={() => setZoom((z) => Math.min(2.5, round(z + 0.25)))} aria-label="Zoom in">
                <Plus size={15} />
              </button>
              <button onClick={() => setZoom(1)} aria-label="Fit to screen">
                <Maximize size={14} />
              </button>
            </div>
            {areaEditing && (
              <div className="pe-area-bar">
                Drag the corners to match where you print on this photo.
                <button className="pe-btn pe-btn-primary" onClick={() => void saveArea()}>
                  Done
                </button>
              </div>
            )}
            {outside && !areaEditing && ready && <div className="pe-warn">Part of your design is outside the print area and won’t be printed.</div>}
          </div>

          <div className="pe-views" role="tablist" aria-label="Product views">
            {surfaces.map((s) => (
              <button
                key={s.id}
                role="tab"
                aria-selected={surfaceId === s.id}
                disabled={locked || areaEditing}
                onClick={() => {
                  if (s.id === surfaceId) return;
                  capture();
                  void loadSurface(s.id);
                }}
              >
                {viewThumbs[s.id] || photoFor(s) ? <img src={viewThumbs[s.id] ?? photoFor(s)!} alt="" /> : <ImageIcon size={18} />}
                <span>
                  {s.name}
                  {s.layers.length ? <i aria-label="Has design" /> : null}
                </span>
              </button>
            ))}
            {(addablePositions.length > 0 || !specs.length) && (
              <button
                className="pe-view-add"
                disabled={locked || areaEditing}
                onClick={() => setViewPicker({ mode: "add", position: addablePositions[0] ?? "back" })}
              >
                <Plus size={18} />
                <span>Add view</span>
              </button>
            )}
          </div>

          {mockups.length > 0 && (
            <div className="pe-mockups" aria-label="Live mockups">
              {mockups.map((m) => (
                <button key={m.color || "default"} title={m.color} aria-pressed={colorName === m.color} onClick={() => pickColor({ name: m.color, hex: m.hex })}>
                  <img src={m.url} alt={m.color ? `${m.color} mockup` : "Mockup"} />
                  {m.color && (
                    <span>
                      <b style={{ background: m.hex }} />
                      {m.color}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </main>

        <aside className="pe-props" aria-label="Properties">
          {selected ? (
            <>
              <div className="pe-props-head">
                <h2>{selected.kind === "text" ? "Text" : "Artwork"}</h2>
                <div>
                  <button className="pe-icon-btn" onClick={() => void duplicate()} aria-label="Duplicate" title="Duplicate">
                    <Copy size={16} />
                  </button>
                  <button className="pe-icon-btn pe-danger" onClick={removeSelected} aria-label="Delete" title="Delete">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {selected.kind === "text" && (
                <section className="pe-section">
                  <textarea
                    className="pe-textarea"
                    rows={2}
                    value={selected.text}
                    onChange={(e) => changeSelected((o) => (o as IText).set({ text: e.target.value }), false)}
                    aria-label="Text"
                  />
                  <div className="pe-row">
                    <select value={selected.font} onChange={(e) => void setFont(e.target.value)} aria-label="Font" className="pe-select">
                      {PRODUCT_FONTS.map((f) => (
                        <option key={f.key} value={f.key}>
                          {f.label}
                        </option>
                      ))}
                    </select>
                    <button
                      className="pe-toggle"
                      aria-pressed={selected.bold}
                      aria-label="Bold"
                      onClick={() => changeSelected((o) => (o as IText).set({ fontWeight: selected.bold ? "normal" : "bold" }))}
                    >
                      <Bold size={15} />
                    </button>
                  </div>
                  <div className="pe-swatches">
                    {TEXT_COLORS.map((c) => (
                      <button key={c} aria-label={c} aria-pressed={selected.color?.toLowerCase() === c} style={{ background: c }} onClick={() => changeSelected((o) => (o as IText).set({ fill: c }))} />
                    ))}
                    <label className="pe-color-input" title="Custom color">
                      <input type="color" value={selected.color?.startsWith("#") ? selected.color : "#101828"} onChange={(e) => changeSelected((o) => (o as IText).set({ fill: e.target.value }), false)} />
                    </label>
                  </div>
                </section>
              )}

              <section className="pe-section">
                <p className="pe-label">Position & size ({unit})</p>
                <div className="pe-grid2">
                  {(
                    [
                      ["left", "X"],
                      ["top", "Y"],
                      ["width", "W"],
                      ["height", "H"],
                    ] as const
                  ).map(([k, label]) => (
                    <label key={k} className="pe-num">
                      <span>{label}</span>
                      <input type="number" step={unit === "in" ? 0.1 : 1} value={selected[k]} onChange={(e) => setGeometry(k, Number(e.target.value))} />
                    </label>
                  ))}
                  <label className="pe-num">
                    <span>↻</span>
                    <input type="number" step={1} value={selected.angle} onChange={(e) => setGeometry("angle", Number(e.target.value))} />
                  </label>
                  <button className="pe-btn pe-btn-ghost pe-small-btn" onClick={fitSelected} title="Fit to print area">
                    <Crop size={14} /> Fit
                  </button>
                </div>
                <p className="pe-label">Align to print area</p>
                <div className="pe-align">
                  {(
                    [
                      ["left", AlignStartVertical],
                      ["hcenter", AlignCenterVertical],
                      ["right", AlignEndVertical],
                      ["top", AlignStartHorizontal],
                      ["vcenter", AlignCenterHorizontal],
                      ["bottom", AlignEndHorizontal],
                    ] as const
                  ).map(([k, Icon]) => (
                    <button key={k} onClick={() => alignSelected(k)} aria-label={`Align ${k}`} title={`Align ${k}`}>
                      <Icon size={16} />
                    </button>
                  ))}
                </div>
                <div className="pe-row">
                  <button className="pe-btn pe-btn-ghost pe-grow" onClick={() => reorder("up")}>
                    <ArrowUp size={14} /> Forward
                  </button>
                  <button className="pe-btn pe-btn-ghost pe-grow" onClick={() => reorder("down")}>
                    <ArrowDown size={14} /> Backward
                  </button>
                </div>
              </section>

              {selected.dpi !== null && (
                <section className="pe-section">
                  <p className={`pe-quality ${selected.dpi >= 150 ? "ok" : selected.dpi >= 100 ? "warn" : "bad"}`}>
                    <b />
                    {selected.dpi >= 150 ? "Good print quality" : selected.dpi >= 100 ? "Okay print quality" : "Low resolution — may print blurry"}
                    <span>{selected.dpi} DPI</span>
                  </p>
                </section>
              )}
            </>
          ) : (
            <>
              <div className="pe-props-head">
                <h2>Product</h2>
              </div>
              {colors.length > 0 && (
                <section className="pe-section">
                  <p className="pe-label">
                    Colors <span>{colorName}</span>
                  </p>
                  <div className="pe-color-swatches">
                    {colors.map((c) => (
                      <button key={c.name} title={c.name} aria-label={c.name} aria-pressed={colorName === c.name} style={{ background: c.hex }} disabled={locked} onClick={() => pickColor(c)} />
                    ))}
                  </div>
                </section>
              )}
              {sizes.length > 0 && (
                <section className="pe-section">
                  <p className="pe-label">Sizes</p>
                  <div className="pe-sizes">
                    {sizes.map((s) => (
                      <span key={s}>{s}</span>
                    ))}
                  </div>
                  <p className="pe-muted pe-small">Change colors, sizes and prices in the next step.</p>
                </section>
              )}
              <section className="pe-section">
                <p className="pe-label">{current.name} print area</p>
                {currentSpec ? (
                  <p className="pe-spec">
                    {round(currentSpec.width / DPI, 1)} × {round(currentSpec.height / DPI, 1)} in
                    <span>
                      {currentSpec.width} × {currentSpec.height} px at {DPI} DPI
                    </span>
                  </p>
                ) : (
                  <p className="pe-muted">Print size not listed for this view.</p>
                )}
                <div className="pe-stack">
                  <button className="pe-btn pe-btn-ghost pe-block" disabled={locked || areaEditing} onClick={startAreaEdit}>
                    <Crop size={15} /> Adjust print area
                  </button>
                  <button className="pe-btn pe-btn-ghost pe-block" disabled={locked} onClick={() => setViewPicker({ mode: "replace", position: current.position ?? "front" })}>
                    <ImageIcon size={15} /> Change photo
                  </button>
                  {current.layers.length > 0 && (
                    <button className="pe-btn pe-btn-ghost pe-block" disabled={locked} onClick={() => void downloadPrint(current)}>
                      <Download size={15} /> Download print file
                    </button>
                  )}
                </div>
              </section>
              <section className="pe-section">
                <p className="pe-muted pe-small">
                  Tip: select anything on the product to size, align or restyle it. Delete removes it, arrow keys nudge it.
                </p>
              </section>
            </>
          )}
        </aside>
      </div>

      {(busy || error) && (
        <div className={`pe-toast ${error ? "pe-toast-error" : ""}`} role={error ? "alert" : "status"}>
          {busy && !error && <Loader2 size={16} className="pe-spin" />}
          {error || busy}
          {error && (
            <button onClick={() => setError("")} aria-label="Dismiss">
              <X size={14} />
            </button>
          )}
        </div>
      )}

      {preview && (
        <div className="pe-modal" role="dialog" aria-modal="true" aria-label="Preview">
          <div className="pe-modal-card pe-preview">
            <div className="pe-modal-head">
              <h2>Preview</h2>
              <button className="pe-icon-btn" onClick={() => setPreview(null)} aria-label="Close preview">
                <X size={18} />
              </button>
            </div>
            <div className="pe-preview-body">
              <div className="pe-preview-main">{previewImage && <img src={previewImage} alt="Mockup" />}</div>
              <div className="pe-preview-side">
                <p className="pe-label">Views</p>
                <div className="pe-preview-thumbs">
                  {preview.views.map((v, i) => (
                    <button key={v.name} aria-pressed={previewPick.kind === "view" && previewPick.index === i} onClick={() => setPreviewPick({ kind: "view", index: i })}>
                      <img src={v.url} alt="" />
                      <span>{v.name}</span>
                    </button>
                  ))}
                </div>
                {preview.colors.length > 1 && (
                  <>
                    <p className="pe-label">Colors</p>
                    <div className="pe-preview-thumbs">
                      {preview.colors.map((c, i) => (
                        <button key={c.color} aria-pressed={previewPick.kind === "color" && previewPick.index === i} onClick={() => setPreviewPick({ kind: "color", index: i })}>
                          <img src={c.url} alt="" />
                          <span>
                            <b style={{ background: c.hex }} />
                            {c.color}
                          </span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
                <p className="pe-label">Print files</p>
                <div className="pe-stack">
                  {surfaces
                    .filter((s) => s.layers.length)
                    .map((s) => (
                      <button key={s.id} className="pe-btn pe-btn-ghost pe-block" disabled={Boolean(busy)} onClick={() => void downloadPrint(s)}>
                        <Download size={15} /> {s.name} print file
                      </button>
                    ))}
                </div>
                <button className="pe-btn pe-btn-primary pe-block pe-mt" disabled={Boolean(busy)} onClick={() => void save(true)}>
                  Continue to pricing
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {viewPicker && (
        <div className="pe-modal" role="dialog" aria-modal="true" aria-label="Choose a photo">
          <div className="pe-modal-card">
            <div className="pe-modal-head">
              <h2>{viewPicker.mode === "add" ? "Add a view" : `Change ${current.name} photo`}</h2>
              <button className="pe-icon-btn" onClick={() => setViewPicker(null)} aria-label="Close">
                <X size={18} />
              </button>
            </div>
            {viewPicker.mode === "add" && (
              <div className="pe-positions">
                {(addablePositions.length ? addablePositions : ["back"]).map((p) => (
                  <button key={p} aria-pressed={viewPicker.position === p} onClick={() => setViewPicker({ ...viewPicker, position: p })}>
                    {POSITION_LABEL[p] ?? p}
                  </button>
                ))}
              </div>
            )}
            <p className="pe-muted">Pick a photo that shows this side flat and straight on.</p>
            {!Object.keys(photoScores).length && (
              <p className="pe-muted pe-small">
                <Loader2 size={13} className="pe-spin" /> Finding the best photos…
              </p>
            )}
            <div className="pe-photo-grid">
              {[...catalogPhotos]
                .sort((a, b) => (photoScores[b] ?? -9) - (photoScores[a] ?? -9))
                .map((src, i) => (
                  <button key={src} disabled={Boolean(busy)} onClick={() => void useViewPhoto({ imageUrl: src })}>
                    <img src={src} alt="" />
                    {i < 2 && (photoScores[src] ?? -1) > 0.3 && <span className="pe-photo-best">Recommended</span>}
                  </button>
                ))}
              <input
                ref={photoInput}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="sr-only"
                aria-label="Upload product photo"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (f) void useViewPhoto({ file: f });
                }}
              />
              <button className="pe-photo-upload" disabled={Boolean(busy)} onClick={() => photoInput.current?.click()}>
                <Upload size={20} />
                <span>Upload your own photo</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
