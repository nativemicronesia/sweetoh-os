import { requirePartnerWorkspace } from "@/lib/domains/identity/service";
import { PartnerNav } from "./partner-nav";

export default async function PartnerLayout({ children }: { children: React.ReactNode }) {
  const session = await requirePartnerWorkspace();

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--so-black)" }}>
      {/* Sidebar */}
      <aside
        className="flex w-56 flex-col border-r"
        style={{ borderColor: "var(--so-border)", background: "var(--so-dark)" }}
      >
        {/* Brand mark */}
        <div className="flex h-14 items-center gap-2 border-b px-4" style={{ borderColor: "var(--so-border)" }}>
          <span className="text-lg font-semibold tracking-tight" style={{ color: "var(--so-gold)" }}>
            Sweet&apos;Oh
          </span>
          <span className="text-xs" style={{ color: "var(--so-cream-dim)" }}>workspace</span>
        </div>

        {/* Partner identity */}
        <div className="border-b px-4 py-3" style={{ borderColor: "var(--so-border)" }}>
          <p className="text-xs font-medium" style={{ color: "var(--so-cream)" }}>
            {session.appUser.name ?? session.appUser.email}
          </p>
          <p className="text-xs" style={{ color: "var(--so-cream-dim)" }}>
            {session.role === "owner" ? "Owner" : "Creator"}
          </p>
        </div>

        {/* Nav */}
        <PartnerNav />

        {/* Dekaz access — no /partner/ask page exists yet, so this is an
            honest disabled state rather than a link to a 404. */}
        <div className="mt-auto border-t p-3" style={{ borderColor: "var(--so-border)" }}>
          <div
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm opacity-40"
            style={{ color: "var(--so-gold)" }}
          >
            <span className="text-base">◆</span>
            <span>Ask Dekaz — coming soon</span>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-4xl px-6 py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
