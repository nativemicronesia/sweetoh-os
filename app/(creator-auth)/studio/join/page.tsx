import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/domains/identity/service";
import { MascotCharacter } from "@/app/(store)/components/mascot-character";
import { AuthForm } from "../auth-form";
import { Waitlist } from "../waitlist";
import { creatorSignupsOpen } from "@/lib/domains/creator/access";
import { AuthArt } from "../auth-art";

export const metadata = { title: "Create your free studio · Sweet'Oh" };

export default async function JoinPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const session = await getSessionUser().catch(() => null);
  if (session?.role === "creator") redirect("/studio");
  const { next } = await searchParams;
  return (
    <div className="cs-auth">
      <section className="cs-auth-form">
        <Link href="/create" className="cs-brand" style={{ padding: 0 }}><MascotCharacter size={34} /><strong>Sweet&apos;Oh</strong></Link>
        {creatorSignupsOpen() ? <AuthForm mode="join" next={next} /> : <Waitlist />}
      </section>
      <AuthArt />
    </div>
  );
}
