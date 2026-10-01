import { WaveLoader } from "@/components/brand/wave-loader";

/** Editor shell while the product, blank and library data load. */
export default function CanvasLoading() {
  return (
    <div className="pe-boot" aria-busy="true">
      <div className="pe-boot-bar" aria-hidden="true" />
      <div className="pe-boot-stage"><WaveLoader label="Setting up your canvas" /></div>
    </div>
  );
}
