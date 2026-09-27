"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePartnerWorkspace } from "@/lib/domains/identity/service";
import { savePartnerInspiration, submitPartnerFeedback } from "@/lib/domains/partner-captures/service";
import { ValidationError } from "@/lib/shared/errors";

export type CaptureResult = { ok: true } | { ok: false; error: string };
function fail(error: unknown): CaptureResult {
  console.error("partner_capture_failed", error instanceof Error ? error.message : error);
  return { ok: false, error: error instanceof ValidationError ? error.message : "Couldn’t save that. Please try again." };
}

export async function addPartnerInspirationAction(form: FormData): Promise<CaptureResult> {
  const session = await requirePartnerWorkspace();
  try {
    const file = form.get("photo");
    if (!(file instanceof File) || !file.size) throw new ValidationError("Choose an image first.");
    await savePartnerInspiration(session, {
      bytes: Buffer.from(await file.arrayBuffer()), name: file.name, mimeType: file.type,
      note: String(form.get("note") ?? ""),
    });
    revalidatePath("/partner/inspiration");
    return { ok: true };
  } catch (error) { return fail(error); }
}

export async function submitPartnerFeedbackAction(form: FormData): Promise<void> {
  const session = await requirePartnerWorkspace();
  const requestedPath = String(form.get("pagePath") ?? "");
  const path = requestedPath === "/partner" || requestedPath.startsWith("/partner/") ? requestedPath : "/partner";
  let result: "sent" | "error" = "sent";
  let errorMessage = "";
  try {
    await submitPartnerFeedback(session, {
      category: String(form.get("category") ?? "idea"), message: String(form.get("message") ?? ""),
      pagePath: path, workflowContext: String(form.get("workflowContext") ?? ""),
    });
  } catch (error) {
    result = "error";
    errorMessage = error instanceof ValidationError ? error.message : "Couldn’t save that. Please try again.";
  }
  revalidatePath(path);
  const query = new URLSearchParams({ feedback: result });
  if (errorMessage) query.set("feedbackMessage", errorMessage);
  redirect(`${path}?${query.toString()}`);
}
