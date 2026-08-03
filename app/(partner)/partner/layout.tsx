import { requirePartnerWorkspace } from "@/lib/domains/identity/service";
import { resolvePartnerWorkspacePack } from "@/lib/domains/workspace/packs";
import { PartnerNav } from "./partner-nav";

export default async function PartnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requirePartnerWorkspace();
  const pack = resolvePartnerWorkspacePack({
    role: session.role,
    ventureSlug: session.ventureSlug,
  });

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ background: "var(--so-black)" }}
    >
      <aside
        className="flex w-56 flex-col border-r"
        style={{ borderColor: "var(--so-border)", background: "var(--so-dark)" }}
      >
        <div
          className="flex h-14 items-center gap-2 border-b px-4"
          style={{ borderColor: "var(--so-border)" }}
        >
          <span
            className="text-lg font-semibold tracking-tight"
            style={{ color: "var(--so-gold)" }}
          >
            Sweet&apos;Oh
          </span>
          <span className="text-xs" style={{ color: "var(--so-cream-dim)" }}>
            studio
          </span>
        </div>

        <div
          className="border-b px-4 py-3"
          style={{ borderColor: "var(--so-border)" }}
        >
          <p className="text-xs font-medium" style={{ color: "var(--so-cream)" }}>
            {session.appUser.name ?? session.appUser.email}
          </p>
          <p className="text-xs" style={{ color: "var(--so-cream-dim)" }}>
            {session.role === "owner" ? "Owner · Studio" : pack.roleLabel}
          </p>
        </div>

        <PartnerNav packId={pack.id} />

        <div
          className="mt-auto border-t p-3"
          style={{ borderColor: "var(--so-border)" }}
        >
          <div
            className="rounded-lg px-3 py-2 text-sm opacity-45"
            style={{ color: "var(--so-cream-dim)" }}
            title={pack.agentSlot.note}
          >
            <p className="font-medium" style={{ color: "var(--so-cream)" }}>
              {pack.agentSlot.label}
            </p>
            <p className="mt-0.5 text-xs">Create later — your shadow for socials</p>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-4xl px-6 py-8">{children}</div>
      </main>
    </div>
  );
}
