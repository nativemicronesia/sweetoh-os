import { FabricImage } from "fabric";
import { renderStickerBorder, stickerBorderPx, type StickerBorder } from "@/lib/studio/sticker-border";

/**
 * An image layer that can wear a die-cut sticker border. Without a border it is
 * exactly Fabric's image. With one it draws the border (with a soft shadow) behind
 * the photo at the resolution the canvas is drawing at, so zoom and print export
 * stay sharp.
 */
export class StudioImage extends FabricImage {
  sticker: StickerBorder | null = null;
  private fx: { key: string; element: unknown; canvas: HTMLCanvasElement; scale: number; pad: number } | null = null;

  setSticker(sticker: StickerBorder | null) {
    this.sticker = sticker && sticker.width > 0 ? sticker : null;
    // The border reaches past the image, which Fabric's object cache would clip.
    this.objectCaching = !this.sticker;
    this.fx = null;
    this.dirty = true;
  }

  _render(ctx: CanvasRenderingContext2D) {
    const sticker = this.sticker;
    const element = this.getElement();
    if (!sticker || !element) {
      super._render(ctx);
      return;
    }
    const matrix = ctx.getTransform();
    const k = Math.min(6, Math.max(0.05, Math.hypot(matrix.a, matrix.b)));
    const border = stickerBorderPx(sticker, this.width, this.height);
    const key = [sticker.color, sticker.width, this.width, this.height, this.cropX, this.cropY, k.toFixed(3)].join("|");
    if (!this.fx || this.fx.key !== key || this.fx.element !== element) {
      const made = renderStickerBorder({ source: element as CanvasImageSource, crop: { x: this.cropX, y: this.cropY, width: this.width, height: this.height }, border, color: sticker.color, scale: k });
      this.fx = { key, element, ...made };
    }
    const { canvas, scale, pad } = this.fx;
    ctx.save();
    ctx.shadowColor = "rgba(16,24,40,0.32)";
    ctx.shadowBlur = border * k * 0.55;
    ctx.shadowOffsetY = border * k * 0.28;
    ctx.drawImage(canvas, -(this.width / 2 + pad), -(this.height / 2 + pad), canvas.width / scale, canvas.height / scale);
    ctx.restore();
    super._render(ctx);
  }
}
