"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { validateImageUpload } from "@/lib/domains/assets/service";
import { requirePartnerWorkspace } from "@/lib/domains/identity/service";
import { uploadStudioJobProductionImage } from "@/lib/domains/studio/production";
import { getActionErrorMessage } from "@/lib/shared/action-errors";
import { ValidationError } from "@/lib/shared/errors";

function redirectWithError(message: string): never {
  redirect(`/partner/jobs?error=${encodeURIComponent(message)}`);
}

export async function uploadApprovedJobImageAction(
  projectId: string,
  formData: FormData,
): Promise<void> {
  try {
    const session = await requirePartnerWorkspace();
    const file = formData.get("file");

    if (!(file instanceof File) || file.size === 0) {
      throw new ValidationError("Choose a product image to upload.");
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    validateImageUpload({
      mimeType: file.type || "application/octet-stream",
      sizeBytes: buffer.length,
    });

    await uploadStudioJobProductionImage({
      ventureId: session.ventureId,
      ventureSlug: session.ventureSlug,
      projectId,
      uploadedByUserId: session.appUser.id,
      file: buffer,
      filename: file.name,
      mimeType: file.type || "application/octet-stream",
      requirePartnerProductionStatus: true,
    });

    revalidatePath("/partner/jobs");
    redirect("/partner/jobs?success=Product+image+uploaded.");
  } catch (error) {
    redirectWithError(getActionErrorMessage(error));
  }
}
