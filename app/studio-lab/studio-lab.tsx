"use client";

import "../(partner)/partner/studio.css";
import { ProductEditor } from "../(partner)/partner/canvas/product-editor";
import { designCanvasSurface } from "@/lib/studio/design-canvas";

const SURFACE = designCanvasSurface({ width: 12, height: 16, unit: "in" });

export function StudioLab() {
  return (
    <div style={{ height: "100vh" }}>
      <style>{":root{--pf-primary:#173e39;--pf-primary-hover:#0f2e2a;--pf-border:#d9d4c6}"}</style>
      <ProductEditor
        standalone
        blanks={[]}
        designs={[]}
        initialDesignId={null}
        initialStudio={{ version: 1, surfaces: [{ ...SURFACE, layers: [] }] }}
        initialName="Lab design"
        draftScope="studio-lab"
        returnHref="/studio-lab"
        returnLabel="Back"
      />
    </div>
  );
}
