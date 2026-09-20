import { MascotCharacter } from "@/app/(store)/components/mascot-character";

/** The editor is heavy; show its frame immediately rather than a white screen. */
export default function DesignLoading() {
  return (
    <div className="cs" style={{ height: "100dvh", display: "grid", placeItems: "center", background: "var(--cs-bg)" }} aria-busy="true">
      <div style={{ textAlign: "center" }}>
        <MascotCharacter size={64} />
        <p className="cs-muted" style={{ marginTop: 12 }}>Opening your Studio…</p>
      </div>
    </div>
  );
}
