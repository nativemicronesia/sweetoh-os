import { Inter } from "next/font/google";
import {
  getDefaultVenture,
  requirePartnerWorkspace,
} from "@/lib/domains/identity/service";
import { resolvePartnerWorkspacePack } from "@/lib/domains/workspace/packs";
import { signOutAction } from "./actions/auth";
import { PartnerFrame } from "./components/partner-frame";
import "./studio.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-partner" });

/**
 * Back office shell: top bar, sidebar and assistant live here rather than in
 * a page, so the assistant conversation survives navigating between pages.
 */
export default async function PartnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [session, venture] = await Promise.all([
    requirePartnerWorkspace(),
    getDefaultVenture().catch(() => null),
  ]);
  const pack = resolvePartnerWorkspacePack({
    role: session.role,
    ventureSlug: session.ventureSlug,
  });

  return (
    <div className={`${inter.variable} h-dvh`}>
      <PartnerFrame
        packId={pack.id}
        displayName={session.appUser.name ?? session.appUser.email}
        roleLabel={session.role === "owner" ? "Owner" : pack.roleLabel}
        storeName={venture?.name ?? "Sweet'Oh"}
        signOut={signOutAction}
      >
        {children}
      </PartnerFrame>
    </div>
  );
}
