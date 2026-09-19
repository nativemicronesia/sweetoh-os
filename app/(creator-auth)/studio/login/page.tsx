import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/domains/identity/service";
import { MascotCharacter } from "@/app/(store)/components/mascot-character";
import { AuthForm } from "../auth-form";
import { AuthArt } from "../auth-art";

export const metadata = { title: "Sign in · Sweet'Oh Studio" };

export default async function StudioLoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string; joined?: string }> }) {
  const session = await getSessionUser().catch(() => null);
  if (session?.role === "creator") redirect("/studio");
  const { next, error, joined } = await searchParams;
  const notice = error === "creators_only" ? "The Sweet'Oh Studio is for creator accounts. Sign in with your creator account, or create one free." : joined ? "Your studio is ready — sign in to open it." : null;
  return (
    <div className="cs-auth">
      <section className="cs-auth-form">
        <Link href="/create" className="cs-brand" style={{ padding: 0 }}><MascotCharacter size={34} /><strong>Sweet&apos;Oh</strong></Link>
        <AuthForm mode="login" next={next} notice={notice} />
      </section>
      <AuthArt />
    </div>
  );
}
