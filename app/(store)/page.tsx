import { redirect } from "next/navigation";
import Link from "next/link";
import { getDefaultVenture, getSessionUser } from "@/lib/domains/identity/service";
import { MascotCharacter } from "./components/mascot-character";
import { FeaturedProducts } from "./components/featured-products";

export default async function HomePage() {
  const session = await getSessionUser();
  if (session?.role === "partner" || session?.role === "owner") {
    redirect("/partner");
  }

  const venture = await getDefaultVenture();

  return (
    <div className="space-y-12">
      <section
        className="flex flex-col items-center gap-5 rounded-lg px-8 py-16 text-center"
        style={{ background: "var(--so-black)", color: "var(--so-cream)" }}
      >
        <MascotCharacter size={72} />
        <h1 className="text-3xl font-semibold sm:text-4xl">
          Custom designs, made by you and Sweet&apos;Oh AI.
        </h1>
        <p className="mx-auto max-w-xl text-sm" style={{ color: "var(--so-cream-dim)" }}>
          Real prints, real products — one-of-a-kind gear designed with you, printed on demand.
        </p>
        <Link
          href="/create"
          className="rounded-full px-6 py-3 text-sm font-medium"
          style={{ background: "var(--so-gold)", color: "var(--so-black)" }}
        >
          Design something with Sweet&apos;Oh AI
        </Link>
      </section>

      <FeaturedProducts ventureId={venture.id} />
    </div>
  );
}
