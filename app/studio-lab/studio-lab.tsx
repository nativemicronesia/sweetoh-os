"use client";

import { useEffect, useState } from "react";
import "../(partner)/partner/studio.css";
import { ProductEditor } from "../(partner)/partner/canvas/product-editor";
import { designCanvasSurface } from "@/lib/studio/design-canvas";
import type { StudioLayer } from "@/lib/domains/catalog/studio-layout";

const SURFACE = designCanvasSurface({ width: 12, height: 16, unit: "in" });
const PHOTO_ID = "11111111-1111-4111-8111-111111111111";

/** A colorful cutout on a transparent background, drawn in the browser so the lab needs no files. */
function makeCutout(): string {
  const c = document.createElement("canvas");
  c.width = 600;
  c.height = 600;
  const g = c.getContext("2d")!;
  g.translate(300, 300);
  g.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? 130 : 260;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    g.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  g.closePath();
  const fill = g.createLinearGradient(-260, -260, 260, 260);
  fill.addColorStop(0, "#f26b5b");
  fill.addColorStop(1, "#f2b84b");
  g.fillStyle = fill;
  g.fill();
  g.beginPath();
  g.arc(0, 10, 70, 0, Math.PI * 2);
  g.fillStyle = "#173e39";
  g.fill();
  return c.toDataURL("image/png");
}

export function StudioLab({ photo = false }: { photo?: boolean }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => { if (photo) queueMicrotask(() => setUrl(makeCutout())); }, [photo]);
  if (photo && !url) return null;
  const a = SURFACE.area;
  const layers: StudioLayer[] = photo
    ? [{ id: "lab-photo-layer", kind: "image", assetId: PHOTO_ID, x: 720 * (a.x + a.width / 2) - 150, y: 720 * (a.y + a.height / 3) - 150, scaleX: 0.5, scaleY: 0.5, angle: 0 }]
    : [];
  return (
    <div style={{ height: "100vh" }}>
      <style>{":root{--pf-primary:#173e39;--pf-primary-hover:#0f2e2a;--pf-border:#d9d4c6}"}</style>
      <ProductEditor
        standalone
        blanks={[]}
        designs={url ? [{ id: PHOTO_ID, name: "Lab photo", previewUrl: url }] : []}
        initialDesignId={null}
        initialStudio={{ version: 1, surfaces: [{ ...SURFACE, layers }] }}
        initialName="Lab design"
        draftScope={photo ? "studio-lab-photo" : "studio-lab"}
        returnHref="/studio-lab"
        returnLabel="Back"
      />
    </div>
  );
}
