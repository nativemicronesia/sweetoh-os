import Link from "next/link";
import { requirePartnerWorkspace } from "@/lib/domains/identity/service";
import {
  countPartnerSweetohJobs,
  statusesForPartnerStage,
} from "@/lib/domains/fulfillment";
import { listActorProductDrafts } from "@/lib/domains/intelligence/service";
import { resolvePartnerWorkspacePack } from "@/lib/domains/workspace/packs";
import { listProductsPendingReview } from "@/lib/domains/catalog/service";
import { canModerateListings } from "@/lib/domains/catalog/partner-listings";
import { listCustomerCustomizationRequests } from "@/lib/domains/studio/service";
import { isPartnerProductionJobStatus } from "@/lib/domains/studio/customer-request";

type TodoItem = {
  id: string;
  label: string;
  href: string;
  count: number;
  hot: boolean;
};

export async function OperationsOverview() {
  const session = await requirePartnerWorkspace();
  const pack = resolvePartnerWorkspacePack({
    role: session.role,
    ventureSlug: session.ventureSlug,
  });
  const canModerate = canModerateListings(session);

  const [newOrders, readyToShip, drafts, pending, customRequests] =
    await Promise.all([
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
      canModerate
        ? listProductsPendingReview(session.ventureId)
        : Promise.resolve([]),
      listCustomerCustomizationRequests(session.ventureId),
    ]);

  const openDrafts = drafts.filter(({ product }) => !product.active).length;
  const onThePress = customRequests.filter((project) =>
    isPartnerProductionJobStatus(project.status),
  ).length;
  const firstName = session.appUser.name?.split(" ")[0];

  // Ordered by urgency — approvals first (they block someone else), then
  // orders going out, then the operator's own unfinished work.
  const todos: TodoItem[] = [
    canModerate
      ? {
          id: "pending",
          label:
            pending.length === 1
              ? "1 listing waiting for your approval"
              : `${pending.length} listings waiting for your approval`,
          href: "/partner/review",
          count: pending.length,
          hot: pending.length > 0,
        }
      : null,
    {
      id: "ship",
      label:
        newOrders + readyToShip === 1
          ? "1 order to move today"
          : `${newOrders + readyToShip} orders to move today`,
      href: "/partner/orders?tab=catalog",
      count: newOrders + readyToShip,
      hot: newOrders + readyToShip > 0,
    },
    {
      id: "press",
      label:
        onThePress === 1
          ? "1 custom job on the press"
          : `${onThePress} custom jobs on the press`,
      href: "/partner/orders?tab=custom",
      count: onThePress,
      hot: onThePress > 0,
    },
    {
      id: "drafts",
      label:
        openDrafts === 1
          ? "1 draft to finish"
          : `${openDrafts} drafts to finish`,
      href: "/partner/review",
      count: openDrafts,
      hot: false,
    },
  ].filter((item): item is TodoItem => item !== null);

  const live = todos.filter((item) => item.count > 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold" style={{ color: "var(--so-cream)" }}>
          Good to see you{firstName ? `, ${firstName}` : ""}.
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--so-cream-dim)" }}>
          {pack.tagline}
        </p>
      </div>

      <section className="space-y-3">
        <p
          className="text-xs font-medium uppercase tracking-widest"
          style={{ color: "var(--so-cream-dim)" }}
        >
          Today
        </p>

        {live.length === 0 ? (
          <div
            className="rounded-xl border px-5 py-6"
            style={{
              borderColor: "var(--so-border)",
              background: "var(--so-dark)",
            }}
          >
            <p className="text-sm" style={{ color: "var(--so-cream)" }}>
              You&apos;re all caught up — nothing is waiting on you.
            </p>
            <p className="mt-1 text-sm" style={{ color: "var(--so-cream-dim)" }}>
              Good time to make something new.
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {live.map((item) => (
              <li key={item.id}>
                <Link
                  href={item.href}
                  className="flex items-center justify-between gap-4 rounded-xl border px-5 py-4 transition-colors hover:border-[var(--so-gold-dim)]"
                  style={{
                    borderColor: item.hot
                      ? "var(--so-gold-dim)"
                      : "var(--so-border)",
                    background: item.hot
                      ? "rgba(201,168,76,0.12)"
                      : "var(--so-dark)",
                  }}
                >
                  <span
                    className="text-sm font-medium"
                    style={{
                      color: item.hot ? "var(--so-gold)" : "var(--so-cream)",
                    }}
                  >
                    {item.label}
                  </span>
                  <span
                    className="text-sm"
                    style={{ color: "var(--so-cream-dim)" }}
                  >
                    Open →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Link
        href={pack.primaryCta.href}
        className="flex flex-col gap-2 rounded-xl border px-5 py-5 transition-colors hover:border-[var(--so-gold-dim)]"
        style={{
          borderColor: "var(--so-gold-dim)",
          background: "rgba(201,168,76,0.16)",
        }}
      >
        <span className="text-sm font-medium" style={{ color: "var(--so-gold)" }}>
          {pack.primaryCta.label}
        </span>
        <span className="text-sm" style={{ color: "var(--so-cream)" }}>
          {pack.primaryCta.note}
        </span>
      </Link>

      <section>
        <p
          className="mb-3 text-xs font-medium uppercase tracking-widest"
          style={{ color: "var(--so-cream-dim)" }}
        >
          {pack.label}
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          {pack.homeCards.map((card) => {
            const counts: Record<string, number> = {
              create: openDrafts,
              review: pending.length + openDrafts,
              orders: newOrders + readyToShip + onThePress,
            };
            const count = counts[card.id] ?? 0;

            return (
              <Link
                key={card.id}
                href={card.href}
                className="rounded-xl border p-5 transition-colors hover:border-[var(--so-gold-dim)]"
                style={{
                  borderColor: "var(--so-border)",
                  background: "var(--so-dark)",
                }}
              >
                <p
                  className="text-sm font-medium"
                  style={{ color: "var(--so-cream)" }}
                >
                  {card.label}
                </p>
                <p
                  className="mt-2 text-2xl font-bold"
                  style={{ color: "var(--so-cream)" }}
                >
                  {count}
                </p>
                <p className="mt-1 text-xs" style={{ color: "var(--so-cream-dim)" }}>
                  {card.note}
                </p>
              </Link>
            );
          })}
        </div>
      </section>


    </div>
  );
}
