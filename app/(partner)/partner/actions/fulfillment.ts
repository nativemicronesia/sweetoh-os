"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { updatePartnerJobStatus } from "@/lib/domains/fulfillment/partner-jobs";
import { requirePartnerWorkspace } from "@/lib/domains/identity/service";
import { getActionErrorMessage } from "@/lib/shared/action-errors";

/**
 * Redirect/revalidate shell. The Sweet'Oh path check and status validation
 * live in `lib/domains/fulfillment/partner-jobs.ts`, shared with the Studio
 * chat's `update_order_status` tool.
 */
function jobPath(jobId: string, query?: Record<string, string>) {
  const params = new URLSearchParams(query);
  const suffix = params.toString();
  return suffix
    ? `/partner/orders/${jobId}?${suffix}`
    : `/partner/orders/${jobId}`;
}

export async function updatePartnerFulfillmentJobStatusAction(
  jobId: string,
  formData: FormData,
): Promise<void> {
  try {
    const session = await requirePartnerWorkspace();

    await updatePartnerJobStatus(session, {
      jobId,
      status: String(formData.get("status") ?? ""),
      trackingNumber: String(formData.get("trackingNumber") ?? "").trim() || null,
      trackingUrl: String(formData.get("trackingUrl") ?? "").trim() || null,
      notes: String(formData.get("notes") ?? "").trim() || null,
    });
  } catch (error) {
    redirect(jobPath(jobId, { error: getActionErrorMessage(error) }));
  }

  revalidatePath("/partner");
  revalidatePath("/partner/orders");
  revalidatePath(jobPath(jobId));
  redirect(jobPath(jobId, { success: "Status updated." }));
}
