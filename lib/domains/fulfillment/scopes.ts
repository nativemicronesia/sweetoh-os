import type { FulfillmentJobStatus } from "./service";

export type PartnerQueueStage =
  | "new"
  | "in_production"
  | "ready_to_ship"
  | "completed";

export const PARTNER_QUEUE_STAGES: {
  stage: PartnerQueueStage;
  label: string;
  href: string;
}[] = [
  {
    stage: "new",
    label: "New Orders",
    href: "/partner/orders?tab=catalog&stage=new",
  },
  {
    stage: "in_production",
    label: "In Production",
    href: "/partner/orders?tab=catalog&stage=in_production",
  },
  {
    stage: "ready_to_ship",
    label: "Ready To Ship",
    href: "/partner/orders?tab=catalog&stage=ready_to_ship",
  },
  {
    stage: "completed",
    label: "Completed",
    href: "/partner/orders?tab=catalog&stage=completed",
  },
];

export function statusesForPartnerStage(
  stage: PartnerQueueStage,
): FulfillmentJobStatus[] {
  switch (stage) {
    case "new":
      return ["new"];
    case "in_production":
      return ["in_production"];
    case "ready_to_ship":
      return ["ready_to_ship"];
    case "completed":
      return ["shipped", "delivered"];
  }
}

export function parsePartnerQueueStage(
  value: string | undefined,
): PartnerQueueStage {
  if (
    value === "new" ||
    value === "in_production" ||
    value === "ready_to_ship" ||
    value === "completed"
  ) {
    return value;
  }

  return "new";
}
