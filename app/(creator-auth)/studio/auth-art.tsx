import { listBestsellerBlueprints } from "@/lib/integrations/printify/catalog";
import { MascotCharacter } from "@/app/(store)/components/mascot-character";

export async function AuthArt() {
  const picks = (await listBestsellerBlueprints().catch(() => [])).filter((b) => b.images[0]).slice(0, 9);
  return (
    <aside className="cs-auth-art">
      <div className="cs-auth-grid" aria-hidden>
        {picks.map((b) => <img key={b.id} src={b.images[0]} alt="" />)}
      </div>
      <div style={{ position: "relative" }}>
        <MascotCharacter size={64} />
        <h2 style={{ marginTop: 14 }}>Your brand. Your store. Skink by your side.</h2>
        <p>Sweet&apos;Oh is the easier way into print-on-demand — built by islanders, for islanders and everyone with an idea worth wearing.</p>
      </div>
    </aside>
  );
}
