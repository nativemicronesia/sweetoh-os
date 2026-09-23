import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireCreator } from "@/lib/domains/identity/service";
import { creatorSideOpen } from "@/lib/domains/creator/access";
import { getCreditBalance } from "@/lib/domains/creator/credits";
import { studioSignOutAction } from "@/app/(creator-auth)/studio/actions";
import { CreatorShell } from "./components/creator-shell";
import "@/app/(partner)/partner/studio.css";
import "./creator.css";

export const metadata: Metadata = {
  title: { default: "Sweet'Oh Studio", template: "%s · Sweet'Oh Studio" },
  robots: { index: false },
};

export default async function CreatorLayout({ children }: { children: React.ReactNode }) {
  if (!creatorSideOpen()) redirect("/");
  const session = await requireCreator();
  const { balance, plan } = await getCreditBalance(session.appUser.id);
  return (
    <CreatorShell
      name={session.appUser.name ?? session.appUser.email}
      email={session.appUser.email}
      planName={plan.name}
      planId={plan.id}
      balance={balance}
      monthlyCredits={plan.monthlyCredits}
      signOut={studioSignOutAction}
    >
      {children}
    </CreatorShell>
  );
}
