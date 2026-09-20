import Link from "next/link";
import { MascotCharacter } from "@/app/(store)/components/mascot-character";

export default function StudioNotFound() {
  return (
    <div className="cs-empty" style={{ background: "white", maxWidth: 560, margin: "40px auto" }}>
      <MascotCharacter size={56} />
      <h3>Can&apos;t find that</h3>
      <p className="cs-muted" style={{ margin: "0 auto 18px", maxWidth: 420 }}>
        It may have been deleted, or the link is out of date. Your work is still in My designs.
      </p>
      <div className="cs-row" style={{ justifyContent: "center" }}>
        <Link href="/studio/designs" className="cs-btn cs-btn-primary">My designs</Link>
        <Link href="/studio/catalog" className="cs-btn cs-btn-ghost">Browse the catalog</Link>
      </div>
    </div>
  );
}
