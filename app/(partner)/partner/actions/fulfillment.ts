"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  updateFulfillmentJobStatus,
  type FulfillmentJobStatus,
} from "@/lib/domains/fulfillment/service";
import { getFulfillmentJobById } from "@/lib/domains/fulfillment/service";
import { requireRole } from "@/lib/domains/identity/service";
import { getActionErrorMessage } from "@/lib/shared/action-errors";
import { ForbiddenError, ValidationError } from "@/lib/shared/errors";

const STATUSES: FulfillmentJobStatus[] = [
  "new",
  "in_production",
  "ready_to_ship",
  "shipped",
  "delivered",
  "cancelled",
];

function jobPath(jobId: string, query?: Record<string, string>) {
  const params = new URLSearchParams(query);
  const suffix = params.toString();
  return suffix
    ? `/partner/queue/${jobId}?${suffix}`
    : `/partner/queue/${jobId}`;
}

async function assertPartnerSweetohJob(ventureId: string, jobId: string) {
  const result = await getFulfillmentJobById({ ventureId, jobId });

  if (result.job.path !== "sweetoh") {
    throw new ForbiddenError("Partners can only manage Sweet'Oh fulfillment jobs.");
  }

  return result;
}

export async function updatePartnerFulfillmentJobStatusAction(
  jobId: string,
  formData: FormData,
): Promise<void> {
  try {
    const session = await requireRole("partner");
    await assertPartnerSweetohJob(session.ventureId, jobId);

    const status = String(formData.get("status") ?? "") as FulfillmentJobStatus;
    const trackingNumber = String(formData.get("trackingNumber") ?? "").trim() || null;
    const trackingUrl = String(formData.get("trackingUrl") ?? "").trim() || null;
    const notes = String(formData.get("notes") ?? "").trim() || null;

    if (!STATUSES.includes(status)) {
      throw new ValidationError("Invalid status.");
    }

    await updateFulfillmentJobStatus({
      ventureId: session.ventureId,
      jobId,
      status,
      trackingNumber,
      trackingUrl,
      notes,
      actorUserId: session.appUser.id,
    });
  } catch (error) {
    redirect(jobPath(jobId, { error: getActionErrorMessage(error) }));
  }

  revalidatePath("/partner");
  revalidatePath("/partner/queue");
  revalidatePath(jobPath(jobId));
  redirect(jobPath(jobId, { success: "Status updated." }));
}
