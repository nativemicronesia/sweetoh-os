"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePartnerWorkspace } from "@/lib/domains/identity/service";
import { CUSTOM_REQUEST_STATUSES, updateInboxRequest } from "@/lib/domains/customers/custom-requests";

export async function updateCustomRequestAction(form: FormData) {
  const session = await requirePartnerWorkspace();
  const id = z.string().uuid().parse(form.get("id"));
  const status = z.enum(CUSTOM_REQUEST_STATUSES).optional().parse(form.get("status") || undefined);
  const notes = form.has("partnerNotes") ? String(form.get("partnerNotes") ?? "") : undefined;
  await updateInboxRequest(session, id, { status, partnerNotes: notes });
  revalidatePath("/partner/custom-requests");
  revalidatePath("/partner");
}
