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

  let unread = 0;
  let newRequests = 0;
  let jobs: Awaited<ReturnType<typeof listFulfillmentJobs>> = [];
  let updatesUnavailable = false;
  if (isShop) {
    const [unreadResult, requestResult, jobsResult] = await Promise.all([
      countUnread(session.ventureId).then((value) => ({ value })).catch(() => ({ unavailable: true as const })),
      countNewRequests(session).then((value) => ({ value })).catch(() => ({ unavailable: true as const })),
      listFulfillmentJobs({ ventureId: session.ventureId, path: "sweetoh", statuses: ["new", "in_production", "ready_to_ship"] })
        .then((value) => ({ value }))
        .catch(() => ({ unavailable: true as const })),
    ]);
    unread = "value" in unreadResult ? unreadResult.value : 0;
    newRequests = "value" in requestResult ? requestResult.value : 0;
    jobs = "value" in jobsResult ? jobsResult.value : [];
    updatesUnavailable = [unreadResult, requestResult, jobsResult].some((result) => "unavailable" in result);
  }
  const onPress = jobs.filter(({ job }) => ["new", "in_production"].includes(job.status)).length;
  const toShip = jobs.filter(({ job }) => job.status === "ready_to_ship").length;
  const greeting = greetingOfTheDay();

  const pulse: PulseItem[] = isShop
    ? [
        ...(unread > 0 ? [{ text: `${unread} new ${unread === 1 ? "message" : "messages"}`, href: "/partner/inbox" }] : []),
        ...(onPress > 0 ? [{ text: `${onPress} ${onPress === 1 ? "order" : "orders"} to make`, href: "/partner/orders" }] : []),
        ...(toShip > 0 ? [{ text: `${toShip} ready to ship`, href: "/partner/orders" }] : []),
        ...(newRequests > 0 ? [{ text: `${newRequests} new custom ${newRequests === 1 ? "request" : "requests"}`, href: "/partner/custom-requests" }] : []),
        ...(updatesUnavailable ? [{ text: "Some shop updates couldn't load. Refresh to check." }] : []),
        ...(!updatesUnavailable && !unread && !onPress && !toShip && !newRequests ? [{ text: "Everything is up to date" }] : []),
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
