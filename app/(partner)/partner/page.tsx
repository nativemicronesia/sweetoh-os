import Link from "next/link";
import { requirePartnerWorkspace } from "@/lib/domains/identity/service";
import {
  countPartnerSweetohJobs,
  statusesForPartnerStage,
} from "@/lib/domains/fulfillment";
import { listActorProductDrafts } from "@/lib/domains/intelligence/service";
import { resolvePartnerWorkspacePack } from "@/lib/domains/workspace/packs";
import { listProductsPendingReview } from "@/lib/domains/catalog/service";

export default async function PartnerDashboard() {
  const session = await requirePartnerWorkspace();
  const pack = resolvePartnerWorkspacePack({
    role: session.role,
    ventureSlug: session.ventureSlug,
  });

  const [queueNew, queueReady, drafts, pending] = await Promise.all([
    countPartnerSweetohJobs({
      ventureId: session.ventureId,
      statuses: statusesForPartnerStage("new"),
    }),
    countPartnerSweetohJobs({
      ventureId: session.ventureId,
      statuses: statusesForPartnerStage("ready_to_ship"),
    }),
    listActorProductDrafts({
      ventureId: session.ventureId,
      actorUserId: session.appUser.id,
    }),
    listProductsPendingReview(session.ventureId),
  ]);

  const openDrafts = drafts.filter(({ product }) => !product.active).length;
  const firstName = session.appUser.name?.split(" ")[0];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold" style={{ color: "var(--so-cream)" }}>
          Good to see you{firstName ? `, ${firstName}` : ""}.
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--so-cream-dim)" }}>
          {pack.tagline}
        </p>
        {session.role === "owner" ? (
          <p className="mt-2 text-xs" style={{ color: "var(--so-cream-dim)" }}>
            Owner on the partner Studio desk.
          </p>
        ) : null}
      </div>

      <Link
        href={pack.primaryCta.href}
        className="flex flex-col gap-2 rounded-xl border px-5 py-5 transition-colors hover:border-[var(--so-gold-dim)]"
        style={{
          borderColor: "var(--so-gold-dim)",
          background: "rgba(201,168,76,0.1)",
        }}
      >
        <span className="text-sm font-medium" style={{ color: "var(--so-gold)" }}>
          {pack.primaryCta.label}
        </span>
        <span className="text-sm" style={{ color: "var(--so-cream)" }}>
          {pack.primaryCta.note}
        </span>
      </Link>

      <div>
        <p
          className="mb-3 text-xs font-medium uppercase tracking-widest"
          style={{ color: "var(--so-cream-dim)" }}
        >
          {pack.label}
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {pack.homeCards.map((card) => {
            let count = 0;
            let detail = card.note;
            let hot = false;
            if (card.id === "create") {
              count = openDrafts;
              detail =
                openDrafts > 0 ? `${openDrafts} open drafts` : "Start a new piece";
            } else if (card.id === "print") {
              count = pending.length;
              detail =
                pending.length > 0
                  ? `${pending.length} waiting on you`
                  : "Nothing waiting on you";
              hot = pending.length > 0 && pack.id === "sweetoh_partner";
            } else if (card.id === "ship") {
              count = queueNew + queueReady;
              detail =
                queueNew + queueReady > 0
                  ? `${queueNew} new · ${queueReady} ready`
                  : "Nothing to ship";
              hot = queueNew + queueReady > 0;
            }
            return (
              <Link
                key={card.id}
                href={card.href}
                className="rounded-xl border p-5 transition-colors hover:border-[var(--so-gold-dim)]"
                style={{
                  borderColor: hot ? "var(--so-gold-dim)" : "var(--so-border)",
                  background: hot ? "rgba(201,168,76,0.05)" : "var(--so-dark)",
                }}
              >
                <p
                  className="text-sm font-medium"
                  style={{ color: hot ? "var(--so-gold)" : "var(--so-cream)" }}
                >
                  {card.label}
                </p>
                <p
                  className="mt-2 text-2xl font-bold"
                  style={{ color: hot ? "var(--so-gold)" : "var(--so-cream)" }}
                >
                  {count}
                </p>
                <p className="mt-1 text-xs" style={{ color: "var(--so-cream-dim)" }}>
                  {detail}
                </p>
              </Link>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/partner/studio"
          className="rounded-full px-4 py-2 text-sm font-medium"
          style={{ background: "var(--so-gold)", color: "var(--so-black)" }}
        >
          Open Studio
        </Link>
      </div>

      <div
        className="rounded-xl border px-5 py-4 opacity-85"
        style={{ borderColor: "var(--so-border)", background: "var(--so-dark)" }}
      >
        <p className="text-sm font-medium" style={{ color: "var(--so-cream)" }}>
          {pack.agentSlot.label}
        </p>
        <p className="mt-1 text-sm" style={{ color: "var(--so-cream-dim)" }}>
          {pack.agentSlot.note}
        </p>
      </div>
    </div>
  );
}
