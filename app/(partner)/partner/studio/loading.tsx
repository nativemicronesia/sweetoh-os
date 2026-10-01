import { WaveLoader } from "@/components/brand/wave-loader";

/** Studio home while its designs and products load. */
export default function StudioLoading() {
  return (
    <div className="sh" aria-busy="true">
      <div className="sh-skeleton-head" aria-hidden="true">
        <div className="sh-skeleton" style={{ width: 160, height: 34 }} />
        <div className="sh-skeleton" style={{ width: 360, height: 14, marginTop: 10 }} />
      </div>
      <div className="sh-types" aria-hidden="true">
        {[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className="sh-skeleton" style={{ height: 150, borderRadius: 12 }} />)}
      </div>
      <WaveLoader label="Opening your Studio" />
    </div>
  );
}
