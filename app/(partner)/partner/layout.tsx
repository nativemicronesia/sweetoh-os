import {
  getDefaultVenture,
  requirePartnerWorkspace,
} from "@/lib/domains/identity/service";
import { resolvePartnerWorkspacePack } from "@/lib/domains/workspace/packs";
import { countNewRequests } from "@/lib/domains/customers/custom-requests";
import { listFulfillmentJobs } from "@/lib/domains/fulfillment";
import { countUnread } from "@/lib/domains/inbox/service";
import { ISLAND_GREETINGS } from "@/lib/shared/island-greetings";
import { signOutAction } from "./actions/auth";
import { PartnerFrame, type PulseItem } from "./components/partner-frame";
import "./studio.css";
import "./brand.css";

/** Today's island greeting — rotates daily through all of Micronesia. */
function greetingOfTheDay() {
  const day = Math.floor(Date.now() / 86_400_000);
  return ISLAND_GREETINGS[day % ISLAND_GREETINGS.length];
}

/**
 * Back office shell: top bar, sidebar and assistant live here rather than in
 * a page, so the assistant conversation survives navigating between pages.
 * The pulse bar carries live shop facts, like the storefront's announcement bar.
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
  const isShop = pack.id !== "sweetoh_creator";

  const [unread, newRequests, jobs] = isShop
    ? await Promise.all([
        countUnread(session.ventureId).catch(() => 0),
        countNewRequests(session).catch(() => 0),
        listFulfillmentJobs({ ventureId: session.ventureId, path: "sweetoh", statuses: ["new", "in_production", "ready_to_ship"] }).catch(() => []),
      ])
    : [0, 0, []];
  const onPress = jobs.filter(({ job }) => ["new", "in_production"].includes(job.status)).length;
  const toShip = jobs.filter(({ job }) => job.status === "ready_to_ship").length;
  const greeting = greetingOfTheDay();

  const pulse: PulseItem[] = isShop
    ? [
        { text: `${greeting.greeting} — ${greeting.place}` },
        unread > 0
          ? { text: `${unread} new ${unread === 1 ? "message" : "messages"} in your inbox`, href: "/partner/inbox" }
          : { text: "Inbox is all caught up", href: "/partner/inbox" },
        onPress > 0 ? { text: `${onPress} ${onPress === 1 ? "order" : "orders"} to press`, href: "/partner/orders" } : { text: "No orders waiting on the press" },
        ...(toShip > 0 ? [{ text: `${toShip} ready to ship`, href: "/partner/orders" }] : []),
        ...(newRequests > 0
          ? [{ text: `${newRequests} new custom ${newRequests === 1 ? "request" : "requests"}`, href: "/partner/custom-requests" }]
          : []),
        { text: "Made to order in Lacey, Washington" },
        ...ISLAND_GREETINGS.filter((g) => g !== greeting).map((g) => ({ text: `${g.greeting} — ${g.place}` })),
      ]
    : [];

  return (
    <div className="h-dvh">
      <PartnerFrame
        packId={pack.id}
        displayName={session.appUser.name ?? session.appUser.email}
        roleLabel={session.role === "owner" ? "Owner" : pack.roleLabel}
        storeName={venture?.name ?? "Sweet'Oh"}
        inboxUnread={unread}
        newRequests={newRequests}
        pulse={pulse}
        greeting={greeting.greeting}
        signOut={signOutAction}
      >
        {children}
      </PartnerFrame>
    </div>
  );
}
