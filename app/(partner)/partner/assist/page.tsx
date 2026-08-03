import Link from "next/link";
import { requirePartnerWorkspace } from "@/lib/domains/identity/service";
import { resolvePartnerWorkspacePack } from "@/lib/domains/workspace/packs";

/**
 * Sweet'Oh AI Assist — docked helper for Studio Create.
 * Not the partner's personal shadow agent. Not Dekaz.
 */
export default async function PartnerAssistPage() {
  const session = await requirePartnerWorkspace();
  const pack = resolvePartnerWorkspacePack({
    role: session.role,
    ventureSlug: session.ventureSlug,
  });

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs" style={{ color: "var(--so-cream-dim)" }}>
          <Link href="/partner/studio/create" className="hover:underline" style={{ color: "var(--so-cream)" }}>
            Studio · Create
          </Link>
          {" / "}
          Assist
        </p>
        <h1 className="mt-2 text-xl font-semibold" style={{ color: "var(--so-cream)" }}>
          {pack.assist.label}
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--so-cream-dim)" }}>
          {pack.assist.note}
        </p>
      </div>

      <div
        className="rounded-xl border px-5 py-6"
        style={{ borderColor: "var(--so-border)", background: "var(--so-dark)" }}
      >
        <p className="text-sm" style={{ color: "var(--so-cream)" }}>
          Chat assist is not live yet — help is already in your Create tools.
        </p>
        <ul className="mt-3 space-y-2 text-sm" style={{ color: "var(--so-cream-dim)" }}>
          <li>
            <Link href="/partner/visual-intake" className="underline" style={{ color: "var(--so-cream)" }}>
              New from photo
            </Link>{" "}
            — AI drafts title, description, listing from your shot.
          </li>
          <li>
            <Link href="/create" className="underline" style={{ color: "var(--so-cream)" }}>
              AI product builder
            </Link>{" "}
            — build art onto a blank with AI.
          </li>
        </ul>
      </div>

      <div
        className="rounded-xl border px-5 py-4 opacity-80"
        style={{ borderColor: "var(--so-border)", background: "var(--so-dark)" }}
      >
        <p className="text-sm font-medium" style={{ color: "var(--so-cream)" }}>
          {pack.agentSlot.label} (later)
        </p>
        <p className="mt-1 text-sm" style={{ color: "var(--so-cream-dim)" }}>
          {pack.agentSlot.note}
        </p>
      </div>
    </div>
  );
}
