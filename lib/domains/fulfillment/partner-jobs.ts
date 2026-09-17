/**
 * Partner-workspace fulfillment operations — the single place the Sweet'Oh
 * path check and status validation live for partner job writes.
 *
 * Shared by the Orders board's Server Action
 * (`app/(partner)/partner/actions/fulfillment.ts`) and the Studio chat tool
 * (`lib/domains/studio-chat/tools.ts`), so both enforce identical rules.
 */

import type { SessionUser } from "@/lib/domains/identity/types";
import { ForbiddenError, ValidationError } from "@/lib/shared/errors";
import {
  getFulfillmentJobById,
  updateFulfillmentJobStatus,
  type FulfillmentJobStatus,
} from "./service";

export const PARTNER_JOB_STATUSES: FulfillmentJobStatus[] = [
  "new",
  "in_production",
  "ready_to_ship",
  "shipped",
  "delivered",
  "cancelled",
];

export function isPartnerJobStatus(
  value: string,
): value is FulfillmentJobStatus {
  return PARTNER_JOB_STATUSES.includes(value as FulfillmentJobStatus);
}

/** Partners may only touch jobs on the Sweet'Oh fulfillment path. */
export async function assertPartnerSweetohJob(ventureId: string, jobId: string) {
  const result = await getFulfillmentJobById({ ventureId, jobId });

  if (result.job.path !== "sweetoh") {
    throw new ForbiddenError(
      "Partners can only manage Sweet'Oh fulfillment jobs.",
    );
  }

  return result;
}

export async function updatePartnerJobStatus(
  session: SessionUser,
  input: {
    jobId: string;
    status: string;
    trackingNumber?: string | null;
    trackingUrl?: string | null;
    notes?: string | null;
  },
) {
  if (session.role !== "partner" && session.role !== "owner") throw new ForbiddenError("Only the shop partner or owner can manage fulfillment.");
  await assertPartnerSweetohJob(session.ventureId, input.jobId);

  if (!isPartnerJobStatus(input.status)) {
    throw new ValidationError("Invalid status.");
  }

  return updateFulfillmentJobStatus({
    ventureId: session.ventureId,
    jobId: input.jobId,
    status: input.status,
    trackingNumber: input.trackingNumber ?? null,
    trackingUrl: input.trackingUrl ?? null,
    notes: input.notes ?? null,
    actorUserId: session.appUser.id,
  });
}
