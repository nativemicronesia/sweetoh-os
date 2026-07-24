"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAssetWithUpload } from "@/lib/domains/assets/service";
import { requirePartnerWorkspace } from "@/lib/domains/identity/service";
import { getActionErrorMessage } from "@/lib/shared/action-errors";

function redirectWithError(message: string): never {
  redirect(`/partner/uploads?error=${encodeURIComponent(message)}`);
}

export async function uploadSweetohDesignAction(formData: FormData): Promise<void> {
  try {
    const session = await requirePartnerWorkspace();
    const name = String(formData.get("name") ?? "").trim();
    const notes = String(formData.get("notes") ?? "").trim() || null;
    const file = formData.get("file");

    if (!name) {
      redirectWithError("Design name is required.");
    }

    if (!(file instanceof File) || file.size === 0) {
      redirectWithError("File is required.");
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    await createAssetWithUpload({
      ventureId: session.ventureId,
      ventureSlug: session.ventureSlug,
      uploadedById: session.appUser.id,
      name,
      assetType: "sweetoh_design",
      file: buffer,
      filename: file.name,
      mimeType: file.type || "application/octet-stream",
      notes,
    });

    revalidatePath("/partner/uploads");
    redirect("/partner/uploads?success=Design%20uploaded%20as%20draft%20for%20owner%20review.");
  } catch (error) {
    redirectWithError(getActionErrorMessage(error));
  }
}
