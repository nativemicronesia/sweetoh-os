"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAssetWithUpload } from "@/lib/domains/assets/service";
import { requirePartnerWorkspace } from "@/lib/domains/identity/service";
import { getActionErrorMessage } from "@/lib/shared/action-errors";

function isNextRedirect(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    String((error as { digest?: unknown }).digest).startsWith("NEXT_REDIRECT")
  );
}

function redirectLibrary(message: string, kind: "error" | "success"): never {
  const key = kind === "error" ? "error" : "success";
  redirect(`/partner/library?${key}=${encodeURIComponent(message)}`);
}

/** @deprecated Prefer uploadLibraryDesignAction — kept for any lingering forms. */
export async function uploadSweetohDesignAction(formData: FormData): Promise<void> {
  try {
    const session = await requirePartnerWorkspace();
    const name = String(formData.get("name") ?? "").trim();
    const notes = String(formData.get("notes") ?? "").trim() || null;
    const file = formData.get("file");

    if (!name) {
      redirectLibrary("Design name is required.", "error");
    }

    if (!(file instanceof File) || file.size === 0) {
      redirectLibrary("File is required.", "error");
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

    revalidatePath("/partner/library");
    revalidatePath("/studio");
    redirectLibrary("Design uploaded as draft for review.", "success");
  } catch (error) {
    if (isNextRedirect(error)) throw error;
    redirectLibrary(getActionErrorMessage(error), "error");
  }
}
