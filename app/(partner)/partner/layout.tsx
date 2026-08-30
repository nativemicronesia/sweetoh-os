import { requirePartnerWorkspace } from "@/lib/domains/identity/service";
import { resolvePartnerWorkspacePack } from "@/lib/domains/workspace/packs";
import { signOutAction } from "./actions/auth";
import { PartnerSidebar } from "./components/partner-sidebar";
import { StudioChat } from "./components/studio-chat";

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
      className="flex h-screen overflow-hidden"
      style={{ background: "var(--so-black)" }}
    >
      <PartnerSidebar
        packId={pack.id}
        displayName={session.appUser.name ?? session.appUser.email}
        roleLabel={session.role === "owner" ? "Owner · Studio" : pack.roleLabel}
        signOut={signOutAction}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <StudioChat />

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-5xl px-6 py-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
