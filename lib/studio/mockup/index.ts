/**
 * Mockup renderers turn "a blank photo + the design for one view" into a
 * product image. The editor's Preview and the per-colour storefront mockups
 * go through here, so a richer renderer (displacement-mapped 2D, 3D scene
 * captures) can replace `flat` without touching the editor or storage.
 */
export type MockupArea = { x: number; y: number; width: number; height: number };
import { getMockupTemplate, type MockupTemplate } from "./templates";

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
  template?: MockupTemplate | null;
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

function point(template: MockupTemplate, u: number, v: number, size: number) {
  const [tl, tr, br, bl] = template.quad;
  const top = { x: tl.x + (tr.x - tl.x) * u, y: tl.y + (tr.y - tl.y) * u };
  const bottom = { x: bl.x + (br.x - bl.x) * u, y: bl.y + (br.y - bl.y) * u };
  return { x: (top.x + (bottom.x - top.x) * v) * size, y: (top.y + (bottom.y - top.y) * v) * size };
}

function drawTriangle(ctx: CanvasRenderingContext2D, image: HTMLCanvasElement, src: { x: number; y: number }[], dst: { x: number; y: number }[]) {
  const [[x1,y1],[x2,y2],[x3,y3]] = src.map(p => [p.x, p.y]);
  const [[u1,v1],[u2,v2],[u3,v3]] = dst.map(p => [p.x,p.y]);
  const det = x1*(y2-y3)+x2*(y3-y1)+x3*(y1-y2);
  if (Math.abs(det) < 0.001) return;
  const a=(u1*(y2-y3)+u2*(y3-y1)+u3*(y1-y2))/det, c=(u1*(x3-x2)+u2*(x1-x3)+u3*(x2-x1))/det, e=(u1*(x2*y3-x3*y2)+u2*(x3*y1-x1*y3)+u3*(x1*y2-x2*y1))/det;
  const b=(v1*(y2-y3)+v2*(y3-y1)+v3*(y1-y2))/det, d=(v1*(x3-x2)+v2*(x1-x3)+v3*(x2-x1))/det, f=(v1*(x2*y3-x3*y2)+v2*(x3*y1-x1*y3)+v3*(x1*y2-x2*y1))/det;
  ctx.save(); ctx.beginPath(); ctx.moveTo(u1,v1); ctx.lineTo(u2,v2); ctx.lineTo(u3,v3); ctx.closePath(); ctx.clip(); ctx.transform(a,b,c,d,e,f); ctx.drawImage(image,0,0); ctx.restore();
}

function drawTemplateArt(ctx: CanvasRenderingContext2D, art: HTMLImageElement, area: MockupArea, template: MockupTemplate, size: number) {
  const left=area.x*art.naturalWidth, top=area.y*art.naturalHeight, width=area.width*art.naturalWidth, height=area.height*art.naturalHeight;
  const source=document.createElement("canvas"); source.width=Math.max(1,Math.ceil(width)); source.height=Math.max(1,Math.ceil(height));
  source.getContext("2d")!.drawImage(art,left,top,width,height,0,0,source.width,source.height);
  const steps=12;
  for(let y=0;y<steps;y++) for(let x=0;x<steps;x++) {
    const u0=x/steps,u1=(x+1)/steps,v0=y/steps,v1=(y+1)/steps;
    const p00=point(template,u0,v0,size),p10=point(template,u1,v0,size),p01=point(template,u0,v1,size),p11=point(template,u1,v1,size);
    ctx.globalCompositeOperation=template.blend; ctx.globalAlpha=template.artworkOpacity;
    const sx0=u0*source.width,sx1=u1*source.width,sy0=v0*source.height,sy1=v1*source.height;
    drawTriangle(ctx,source,[{x:sx0,y:sy0},{x:sx1,y:sy0},{x:sx1,y:sy1}],[p00,p10,p11]);
    drawTriangle(ctx,source,[{x:sx0,y:sy0},{x:sx1,y:sy1},{x:sx0,y:sy1}],[p00,p11,p01]);
  }
  ctx.globalAlpha=1; ctx.globalCompositeOperation="source-over";
}

/** Today's renderer: the design laid flat over the photo. */
export const flatRenderer: MockupRenderer = {
  id: "flat",
  label: "Flat",
  async render({ photo, design, area, size, product, template: suppliedTemplate }) {
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
    const template = suppliedTemplate ?? getMockupTemplate(product.blankId, product.position);
    if (template) drawTemplateArt(ctx, art, area, template, size);
    else {
      ctx.save(); ctx.beginPath(); ctx.rect(area.x * size, area.y * size, area.width * size, area.height * size); ctx.clip();
      ctx.drawImage(art, 0, 0, size, size); ctx.restore();
    }
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
