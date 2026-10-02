"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowLeft, ArrowUp, Grid2X2, LayoutPanelLeft, Plus, Trash2, Upload } from "lucide-react";
import { designCanvasSurface, designPixels, type DesignSize } from "@/lib/studio/design-canvas";
import { finishArtworkImportAction, prepareArtworkImportAction } from "../../actions/builder";
import { saveStudioDesignAction } from "../../actions/studio-design";
import styles from "./collage-maker.module.css";

type Photo = {
  id: string;
  file: File;
  url: string;
  width: number;
  height: number;
  assetId?: string;
  previewUrl?: string;
};
type Frame = { x: number; y: number; width: number; height: number };
type LayoutMode = "mosaic" | "grid";
type ImageCrop = { x: number; y: number; width: number; height: number };
type SizeOption = { id: string; label: string; size: DesignSize };

const SIZES: SizeOption[] = [
  { id: "square", label: "Square · 12 × 12 in", size: { width: 12, height: 12, unit: "in" } },
  { id: "portrait", label: "Portrait · 12 × 16 in", size: { width: 12, height: 16, unit: "in" } },
  { id: "landscape", label: "Landscape · 16 × 12 in", size: { width: 16, height: 12, unit: "in" } },
  { id: "social", label: "Social · 1080 × 1080 px", size: { width: 1080, height: 1080, unit: "px" } },
];
const BACKGROUNDS = ["#ffffff", "#f0e8dc", "#d6e6df", "#dce7f0", "#253b36", "#17191c"];
const MAX_PHOTOS = 6;
const STAGE = 720;

function framesFor(count: number, aspect: number, mode: LayoutMode): Frame[] {
  if (count < 1) return [];
  if (mode === "grid" || count === 1) {
    const columns = aspect > 1.15 ? (count >= 3 ? 3 : 2) : aspect < 0.86 ? 2 : 2;
    const rows = Math.ceil(count / columns);
    return Array.from({ length: count }, (_, index) => ({
      x: (index % columns) / columns,
      y: Math.floor(index / columns) / rows,
      width: 1 / columns,
      height: 1 / rows,
    }));
  }
  if (count === 2) {
    return aspect >= 1
      ? [{ x: 0, y: 0, width: 0.5, height: 1 }, { x: 0.5, y: 0, width: 0.5, height: 1 }]
      : [{ x: 0, y: 0, width: 1, height: 0.5 }, { x: 0, y: 0.5, width: 1, height: 0.5 }];
  }

  const landscape = aspect >= 1;
  const featured = Math.min(0.64, Math.max(0.54, aspect >= 1.25 ? 0.62 : 0.58));
  const remaining = count - 1;
  const columns = remaining <= 3 ? 1 : 2;
  const rows = Math.ceil(remaining / columns);
  if (landscape) {
    const side = 1 - featured;
    return [
      { x: 0, y: 0, width: featured, height: 1 },
      ...Array.from({ length: remaining }, (_, index) => ({
        x: featured + (index % columns) * (side / columns),
        y: Math.floor(index / columns) / rows,
        width: side / columns,
        height: 1 / rows,
      })),
    ];
  }
  const bottom = 1 - featured;
  const bottomColumns = remaining <= 3 ? remaining : 2;
  const bottomRows = Math.ceil(remaining / bottomColumns);
  return [
    { x: 0, y: 0, width: 1, height: featured },
    ...Array.from({ length: remaining }, (_, index) => ({
      x: (index % bottomColumns) / bottomColumns,
      y: featured + Math.floor(index / bottomColumns) * (bottom / bottomRows),
      width: 1 / bottomColumns,
      height: bottom / bottomRows,
    })),
  ];
}

function coverCrop(photoWidth: number, photoHeight: number, targetWidth: number, targetHeight: number): ImageCrop {
  const sourceRatio = photoWidth / photoHeight;
  const targetRatio = targetWidth / targetHeight;
  if (sourceRatio > targetRatio) {
    const width = photoHeight * targetRatio;
    return { x: (photoWidth - width) / 2, y: 0, width, height: photoHeight };
  }
  const height = photoWidth / targetRatio;
  return { x: 0, y: (photoHeight - height) / 2, width: photoWidth, height };
}

function loadImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("A photo could not be opened."));
    image.src = source;
  });
}

function drawPhoto(ctx: CanvasRenderingContext2D, image: HTMLImageElement, frame: Frame, width: number, height: number, gutter: number, rounded: boolean) {
  const x = frame.x * width + gutter / 2;
  const y = frame.y * height + gutter / 2;
  const w = Math.max(1, frame.width * width - gutter);
  const h = Math.max(1, frame.height * height - gutter);
  const crop = coverCrop(image.naturalWidth, image.naturalHeight, w, h);
  const radius = rounded ? Math.min(w, h) * 0.16 : 0;
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, radius);
  ctx.clip();
  ctx.drawImage(image, crop.x, crop.y, crop.width, crop.height, x, y, w, h);
  ctx.restore();
}

function canvasBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("The collage export failed. Try again.")), "image/jpeg", 0.96));
}

export function CollageMaker() {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const urls = useRef(new Set<string>());
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [sizeId, setSizeId] = useState("square");
  const [layout, setLayout] = useState<LayoutMode>("mosaic");
  const [gutter, setGutter] = useState(14);
  const [rounded, setRounded] = useState(true);
  const [background, setBackground] = useState("#ffffff");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const selectedSize = SIZES.find((item) => item.id === sizeId) ?? SIZES[0];
  const aspect = selectedSize.size.width / selectedSize.size.height;
  const frames = useMemo(() => framesFor(photos.length, aspect, layout), [photos.length, aspect, layout]);

  useEffect(() => () => { for (const url of urls.current) URL.revokeObjectURL(url); }, []);

  useEffect(() => {
    let cancelled = false;
    const element = canvas.current;
    if (!element) return;
    const width = 720;
    const height = Math.round(width / aspect);
    element.width = width;
    element.height = height;
    const ctx = element.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, width, height);
    void Promise.all(photos.map((photo) => loadImage(photo.previewUrl ?? photo.url)))
      .then((images) => {
        if (cancelled) return;
        images.forEach((image, index) => drawPhoto(ctx, image, frames[index], width, height, gutter, rounded));
      })
      .catch(() => { if (!cancelled) setError("A photo preview could not be loaded."); });
    return () => { cancelled = true; };
  }, [photos, aspect, background, frames, gutter, rounded]);

  async function readFiles(files: FileList | null) {
    if (!files?.length) return;
    setError("");
    const remaining = MAX_PHOTOS - photos.length;
    const accepted = Array.from(files).filter((file) => /^image\/(png|jpe?g|webp)$/i.test(file.type)).slice(0, remaining);
    if (!accepted.length) {
      setError(remaining <= 0 ? `A collage can use up to ${MAX_PHOTOS} photos.` : "Choose PNG, JPEG or WebP photos.");
      return;
    }
    const next: Photo[] = [];
    for (const file of accepted) {
      try {
        const url = URL.createObjectURL(file);
        urls.current.add(url);
        const image = await loadImage(url);
        next.push({ id: crypto.randomUUID(), file, url, width: image.naturalWidth, height: image.naturalHeight });
      } catch {
        setError("One of those photos could not be opened.");
      }
    }
    setPhotos((current) => [...current, ...next].slice(0, MAX_PHOTOS));
    if (accepted.length < files.length || next.length < accepted.length) setError(`Choose up to ${MAX_PHOTOS} valid photos total.`);
  }

  function removePhoto(id: string) {
    setPhotos((current) => {
      const photo = current.find((item) => item.id === id);
      if (photo) { URL.revokeObjectURL(photo.url); urls.current.delete(photo.url); }
      return current.filter((item) => item.id !== id);
    });
  }

  function movePhoto(index: number, direction: -1 | 1) {
    setPhotos((current) => {
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= current.length) return current;
      const next = [...current];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
  }

  async function importPhoto(photo: Photo): Promise<Photo> {
    if (photo.assetId && photo.previewUrl) return photo;
    const prepared = await prepareArtworkImportAction({ name: photo.file.name, type: photo.file.type, size: photo.file.size });
    if (!prepared.ok) throw new Error(prepared.error);
    const uploaded = await fetch(prepared.url, { method: "PUT", body: photo.file, headers: { "Content-Type": photo.file.type, "x-upsert": "true" } });
    if (!uploaded.ok) throw new Error(`Couldn’t upload ${photo.file.name}.`);
    const imported = await finishArtworkImportAction({ key: prepared.key, name: photo.file.name, targetWidthPx: 6000 });
    if (!imported.ok || !imported.previewUrl) throw new Error(imported.ok ? "The imported photo preview is unavailable." : imported.error);
    return {
      ...photo,
      assetId: imported.assetId,
      previewUrl: imported.previewUrl,
      // Import normalizes EXIF rotation and caps the saved image at 6000px.
      // Persist crop coordinates against those saved pixels, not the original file.
      width: imported.report.width,
      height: imported.report.height,
    };
  }

  function makeLayout(readyPhotos: Photo[], contentArea: { x: number; y: number; width: number; height: number }, aspectRatio: number, mode: LayoutMode) {
    const slots = framesFor(readyPhotos.length, aspectRatio, mode);
    const gap = gutter;
    const layers = [
      {
        id: crypto.randomUUID(), kind: "shape" as const, shape: "rect" as const, fill: background,
        printRegionId: "canvas", x: contentArea.x * STAGE, y: contentArea.y * STAGE,
        width: contentArea.width * STAGE, height: contentArea.height * STAGE, scaleX: 1, scaleY: 1, angle: 0,
      },
      ...readyPhotos.map((photo, index) => {
        const frame = slots[index];
        const width = Math.max(1, frame.width * contentArea.width * STAGE - gap);
        const height = Math.max(1, frame.height * contentArea.height * STAGE - gap);
        const crop = coverCrop(photo.width, photo.height, width, height);
        return {
          id: crypto.randomUUID(), kind: "image" as const, assetId: photo.assetId!,
          printRegionId: "canvas", crop,
          mask: rounded ? "rounded" as const : undefined,
          x: contentArea.x * STAGE + frame.x * contentArea.width * STAGE + gap / 2,
          y: contentArea.y * STAGE + frame.y * contentArea.height * STAGE + gap / 2,
          scaleX: width / crop.width, scaleY: height / crop.height, angle: 0,
        };
      }),
    ];
    return layers;
  }

  function createCollage() {
    if (photos.length < 2 || pending) return;
    setError("");
    startTransition(async () => {
      try {
        const ready: Photo[] = [];
        for (const photo of photos) {
          const imported = await importPhoto(photo);
          ready.push(imported);
          setPhotos((current) => current.map((item) => item.id === photo.id ? imported : item));
        }
        const pixels = designPixels(selectedSize.size);
        const output = document.createElement("canvas");
        output.width = pixels.width;
        output.height = pixels.height;
        const ctx = output.getContext("2d");
        if (!ctx) throw new Error("Your browser couldn’t prepare the collage canvas.");
        ctx.fillStyle = background;
        ctx.fillRect(0, 0, output.width, output.height);
        const images = await Promise.all(ready.map((photo) => loadImage(photo.previewUrl ?? photo.url)));
        const slots = framesFor(ready.length, aspect, layout);
        images.forEach((image, index) => drawPhoto(ctx, image, slots[index], output.width, output.height, gutter * output.width / STAGE, rounded));
        const blob = await canvasBlob(output);
        const surface = designCanvasSurface(selectedSize.size);
        const studioLayout = { version: 1, surfaces: [{ ...surface, layers: makeLayout(ready, surface.area, aspect, layout) }] };
        const form = new FormData();
        form.set("name", "Photo collage");
        form.set("file", new File([blob], "photo-collage.jpg", { type: "image/jpeg" }));
        form.set("studioLayout", JSON.stringify(studioLayout));
        const saved = await saveStudioDesignAction(form);
        if ("error" in saved) throw new Error(saved.error);
        router.push(`/partner/canvas?composition=${encodeURIComponent(saved.saved.id)}`);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Couldn’t create the collage. Your photos are still here; try again.");
      }
    });
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <a className={styles.back} href="/partner/studio"><ArrowLeft size={16} /> Studio</a>
          <p className={styles.eyebrow}>PHOTO STUDIO</p>
          <h1>Make a collage</h1>
          <p className={styles.subtitle}>Bring photos together. Open the finished collage in Studio to keep editing every image.</p>
        </div>
        <button className={styles.create} type="button" onClick={createCollage} disabled={photos.length < 2 || pending}>
          {pending ? "Preparing your collage…" : "Create editable collage"}
        </button>
      </header>

      {error && <p className={styles.error} role="alert">{error}</p>}
      <div className={styles.workspace}>
        <section className={styles.previewPanel} aria-label="Collage preview">
          <div className={styles.previewTop}><span>Live preview</span><small>{selectedSize.label}</small></div>
          <div className={styles.artboard} style={{ aspectRatio: String(aspect), background }}>
            <canvas ref={canvas} aria-label={`${photos.length}-photo collage preview`} />
            {photos.length < 2 && <div className={styles.empty}><span><LayoutPanelLeft size={24} /></span><strong>Your collage will take shape here</strong><small>Add 2 to {MAX_PHOTOS} photos to begin.</small></div>}
          </div>
          <div className={styles.previewFooter}><span>{photos.length} of {MAX_PHOTOS} photos</span><span>Each photo remains an editable layer</span></div>
        </section>

        <aside className={styles.controls}>
          <section className={styles.controlSection}>
            <div className={styles.sectionHead}><span>01</span><div><h2>Your photos</h2><p>Choose 2–{MAX_PHOTOS}; reorder them to change the collage.</p></div></div>
            <input ref={input} className={styles.hiddenInput} type="file" accept="image/png,image/jpeg,image/webp" multiple onChange={(event) => { void readFiles(event.target.files); event.currentTarget.value = ""; }} />
            <button className={styles.upload} type="button" onClick={() => input.current?.click()} disabled={photos.length >= MAX_PHOTOS}>
              <Upload size={16} /> Add photos <span>PNG, JPEG or WebP</span>
            </button>
            {photos.length > 0 && <ol className={styles.photoList}>{photos.map((photo, index) => (
              <li key={photo.id}>
                {/* eslint-disable-next-line @next/next/no-img-element */}<img src={photo.previewUrl ?? photo.url} alt="" />
                <span><strong>Photo {index + 1}</strong><small>{photo.width} × {photo.height}</small></span>
                <button type="button" aria-label={`Move photo ${index + 1} up`} disabled={index === 0} onClick={() => movePhoto(index, -1)}><ArrowUp size={14} /></button>
                <button type="button" aria-label={`Move photo ${index + 1} down`} disabled={index === photos.length - 1} onClick={() => movePhoto(index, 1)}><ArrowDown size={14} /></button>
                <button type="button" aria-label={`Remove photo ${index + 1}`} onClick={() => removePhoto(photo.id)}><Trash2 size={14} /></button>
              </li>
            ))}</ol>}
          </section>

          <section className={styles.controlSection}>
            <div className={styles.sectionHead}><span>02</span><div><h2>Layout &amp; size</h2><p>Choose a starting canvas. You can resize it in Studio.</p></div></div>
            <div className={styles.layoutChoices} role="group" aria-label="Collage layout">
              <button type="button" aria-pressed={layout === "mosaic"} onClick={() => setLayout("mosaic")}><LayoutPanelLeft size={17} /> Mosaic</button>
              <button type="button" aria-pressed={layout === "grid"} onClick={() => setLayout("grid")}><Grid2X2 size={17} /> Grid</button>
            </div>
            <label className={styles.field}>Canvas size<select value={sizeId} onChange={(event) => setSizeId(event.target.value)}>{SIZES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
          </section>

          <section className={styles.controlSection}>
            <div className={styles.sectionHead}><span>03</span><div><h2>Finish</h2><p>Set the space and tone between your photos.</p></div></div>
            <label className={styles.slider}><span>Spacing <b>{gutter}px</b></span><input type="range" min={0} max={36} step={1} value={gutter} onChange={(event) => setGutter(Number(event.target.value))} /></label>
            <label className={styles.toggle}><input type="checkbox" checked={rounded} onChange={(event) => setRounded(event.target.checked)} /><span>Soft photo corners</span></label>
            <div className={styles.colors}><span>Background</span><div>{BACKGROUNDS.map((color) => <button key={color} type="button" aria-label={`Use ${color} background`} aria-pressed={background === color} style={{ background: color }} onClick={() => setBackground(color)} />)}<label className={styles.customColor} title="Choose a background color"><Plus size={15} /><input type="color" value={background} onChange={(event) => setBackground(event.target.value)} aria-label="Custom collage background" /></label></div></div>
          </section>

          <p className={styles.printNote}>The collage opens as an editable Studio design. You can adjust each photo, add text or artwork, and prepare it for print.</p>
        </aside>
      </div>
    </main>
  );
}
