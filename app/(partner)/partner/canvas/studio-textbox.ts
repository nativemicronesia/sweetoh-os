import { Textbox } from "fabric";
import { renderTextEffect, type TextEffect } from "@/lib/studio/text-effects";

/**
 * A text object that can carry a text effect. Without an effect it renders
 * exactly like Fabric's Textbox; with one it draws the finished bitmap from the
 * effect renderer at the resolution the canvas is currently drawing at, so
 * zooming and print export stay sharp.
 */
export class StudioTextbox extends Textbox {
  effect: TextEffect | null = null;
  private fx: { key: string; canvas: HTMLCanvasElement; scale: number } | null = null;

  setEffect(effect: TextEffect | null) {
    this.effect = effect;
    // The effect bitmap replaces Fabric's own object cache, which would clip glows and shadows.
    this.objectCaching = !effect;
    this.fx = null;
    this.dirty = true;
  }

  _render(ctx: CanvasRenderingContext2D) {
    const effect = this.effect;
    if (!effect) {
      super._render(ctx);
      return;
    }
    const matrix = ctx.getTransform();
    const k = Math.min(6, Math.max(0.5, Math.hypot(matrix.a, matrix.b)));
    const fill = typeof this.fill === "string" ? this.fill : "#000000";
    const stroke = typeof this.stroke === "string" ? this.stroke : null;
    const strokeWidth = this.strokeWidth || 0;
    const key = [
      JSON.stringify(effect), this.text, this.fontFamily, this.fontSize, this.fontWeight, this.fontStyle, fill, stroke, strokeWidth,
      this.charSpacing, this.textAlign, this.lineHeight, this.width, this.height, this.path ? JSON.stringify(this.path.path) : "",
      k.toFixed(2), typeof document !== "undefined" ? document.fonts?.size : 0,
    ].join("|");
    if (!this.fx || this.fx.key !== key) {
      const paint = (g: CanvasRenderingContext2D, f: string | null, s: string | null, w: number) => {
        const saved = { fill: this.fill, stroke: this.stroke, strokeWidth: this.strokeWidth, join: this.strokeLineJoin };
        this.fill = f;
        this.stroke = s;
        this.strokeWidth = s ? w : 0;
        this.strokeLineJoin = "round";
        try {
          super._render(g);
        } finally {
          this.fill = saved.fill;
          this.stroke = saved.stroke;
          this.strokeWidth = saved.strokeWidth;
          this.strokeLineJoin = saved.join;
        }
      };
      const { canvas, scale } = renderTextEffect({ effect, width: this.width, height: this.height, k, unit: Math.min(3, Math.max(0.4, this.fontSize / 40)), fill, stroke, strokeWidth, paint });
      this.fx = { key, canvas, scale };
    }
    const { canvas, scale } = this.fx;
    ctx.drawImage(canvas, -canvas.width / (2 * scale), -canvas.height / (2 * scale), canvas.width / scale, canvas.height / scale);
  }
}
