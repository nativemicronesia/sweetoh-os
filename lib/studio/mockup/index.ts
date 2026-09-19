/**
 * Mockup renderers turn "a blank photo + the design for one view" into a
 * product image. The editor's Preview and the per-colour storefront mockups
 * go through here, so a richer renderer (displacement-mapped 2D, 3D scene
 * captures) can replace `flat` without touching the editor or storage.
 */
export type MockupArea = { x: number; y: number; width: number; height: number };

export type MockupInput = {
  /** Blank photo for this view, already recoloured to the garment colour. */
  photo: string;
  /** The view's artwork as a transparent PNG on the full editor canvas. */
  design: string;
  /** Print area, as fractions of the square canvas. */
  area: MockupArea;
  /** Canvas side in px (the editor works on a 720px square). */
  size: number;
  /** Product/view identity, for renderers that need per-product templates or models. */
  product: { blankId: string; position?: string; color?: string | null };
};

export interface MockupRenderer {
  id: string;
  label: string;
  /** Returns a JPEG/PNG data URL. */
  render(input: MockupInput): Promise<string>;
}

function load(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Mockup image failed to load"));
    img.src = src;
  });
}

/** Today's renderer: the design laid flat over the photo. */
export const flatRenderer: MockupRenderer = {
  id: "flat",
  label: "Flat",
  async render({ photo, design, size }) {
    const [base, art] = await Promise.all([load(photo), load(design)]);
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#f4f5f7";
    ctx.fillRect(0, 0, size, size);
    const r = Math.min(size / base.naturalWidth, size / base.naturalHeight);
    const w = base.naturalWidth * r, h = base.naturalHeight * r;
    ctx.drawImage(base, (size - w) / 2, (size - h) / 2, w, h);
    ctx.drawImage(art, 0, 0, size, size);
    return canvas.toDataURL("image/jpeg", 0.88);
  },
};

const RENDERERS: Record<string, MockupRenderer> = { flat: flatRenderer };

export function registerMockupRenderer(renderer: MockupRenderer) {
  RENDERERS[renderer.id] = renderer;
}

export function getMockupRenderer(id = "flat"): MockupRenderer {
  return RENDERERS[id] ?? flatRenderer;
}
