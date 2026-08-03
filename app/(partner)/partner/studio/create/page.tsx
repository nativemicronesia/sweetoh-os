import Link from "next/link";
import { requirePartnerWorkspace } from "@/lib/domains/identity/service";
import { listActorProductDrafts } from "@/lib/domains/intelligence/service";
import { resolvePartnerWorkspacePack } from "@/lib/domains/workspace/packs";

export default async function StudioCreatePage() {
  const session = await requirePartnerWorkspace();
  const pack = resolvePartnerWorkspacePack({
    role: session.role,
    ventureSlug: session.ventureSlug,
  });

  const drafts = await listActorProductDrafts({
    ventureId: session.ventureId,
    actorUserId: session.appUser.id,
  });
  const openDrafts = drafts.filter(({ product }) => !product.active).length;

  const doors = [
    {
      href: "/partner/visual-intake",
      label: "New from photo",
      note: "Photograph a piece — Sweet'Oh AI drafts the listing.",
      meta: "Start here",
      hot: true,
    },
    {
      href: "/create",
      label: "AI product builder",
      note: "Build art onto a blank with AI — same builder customers use.",
      meta: "Builder",
      hot: false,
    },
    {
      href: "/partner/drafts",
      label: "Drafts",
      note:
        pack.id === "sweetoh_creator"
          ? "Finish copy, then submit for Sweet'Oh review."
          : "Finish price and copy — publish or send to pending.",
      meta: openDrafts > 0 ? `${openDrafts} open` : "None open",
      hot: openDrafts > 0,
    },
  ] as const;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs" style={{ color: "var(--so-cream-dim)" }}>
          <Link href="/partner/studio" className="hover:underline" style={{ color: "var(--so-cream)" }}>
            Studio
          </Link>
          {" / "}
          Create
        </p>
        <h1 className="mt-2 text-xl font-semibold" style={{ color: "var(--so-cream)" }}>
          Create
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--so-cream-dim)" }}>
          Hands on first. Sweet&apos;Oh AI helps when you ask.
        </p>
      </div>

      <div className="space-y-3">
        {doors.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex flex-col gap-1 rounded-xl border px-5 py-4 transition-colors hover:border-[var(--so-gold-dim)]"
            style={{
              borderColor: item.hot ? "var(--so-gold-dim)" : "var(--so-border)",
              background: item.hot
                ? "rgba(201,168,76,0.08)"
                : "var(--so-dark)",
            }}
          >
            <div className="flex items-baseline justify-between gap-3">
              <span
                className="text-sm font-medium"
                style={{ color: item.hot ? "var(--so-gold)" : "var(--so-cream)" }}
              >
                {item.label}
              </span>
              <span className="text-xs" style={{ color: "var(--so-cream-dim)" }}>
                {item.meta}
              </span>
            </div>
            <span className="text-sm" style={{ color: "var(--so-cream-dim)" }}>
              {item.note}
            </span>
          </Link>
        ))}
      </div>

      <Link
        href={pack.assist.href}
        className="block rounded-xl border px-5 py-4 transition-colors hover:border-[var(--so-gold-dim)]"
        style={{ borderColor: "var(--so-border)", background: "var(--so-dark)" }}
      >
        <p className="text-sm font-medium" style={{ color: "var(--so-gold)" }}>
          {pack.assist.label}
        </p>
        <p className="mt-1 text-sm" style={{ color: "var(--so-cream-dim)" }}>
          {pack.assist.note}
        </p>
      </Link>
    </div>
  );
}
