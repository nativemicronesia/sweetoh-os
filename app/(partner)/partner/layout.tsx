import { requirePartnerWorkspace } from "@/lib/domains/identity/service";
import { resolvePartnerWorkspacePack } from "@/lib/domains/workspace/packs";
import { signOutAction } from "./actions/auth";
import { PartnerSidebar } from "./components/partner-sidebar";
import { StudioShell } from "./components/studio-shell";
import "./studio.css";

/**
 * Command center shell: sidebar on the left, the persistent Studio chat bar
 * docked at the top of the main column, and the workspace below it. Both the
 * sidebar and the chat live here rather than in a page, so the conversation
 * survives navigating between Overview, Create, Review, and Orders.
 */
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
      className="sweetoh-studio flex h-dvh flex-col overflow-hidden md:flex-row"
      style={{ background: "var(--so-black)" }}
    >
      <PartnerSidebar
        packId={pack.id}
        displayName={session.appUser.name ?? session.appUser.email}
        roleLabel={session.role === "owner" ? "Owner · Studio" : pack.roleLabel}
        signOut={signOutAction}
      />

      <StudioShell>{children}</StudioShell>
    </div>
  );
}
