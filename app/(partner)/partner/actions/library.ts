"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { approveAsset } from "@/lib/domains/assets/service";
import { uploadPartnerDesign } from "@/lib/domains/catalog/partner-design-library";
import { canModerateListings } from "@/lib/domains/catalog/partner-listings";
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

export async function uploadLibraryDesignAction(formData: FormData): Promise<void> {
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
    const autoApprove = canModerateListings(session);

    await uploadPartnerDesign({
      ventureId: session.ventureId,
      ventureSlug: session.ventureSlug,
      uploadedById: session.appUser.id,
      name,
      notes,
      file: buffer,
      filename: file.name,
      mimeType: file.type || "image/png",
      autoApprove,
    });

    revalidatePath("/partner/library");
    revalidatePath("/studio");
    redirectLibrary(
      autoApprove
        ? "Design uploaded and available in Studio."
        : "Design uploaded as draft — waiting for partner approval.",
      "success",
    );
  } catch (error) {
    if (isNextRedirect(error)) throw error;
    redirectLibrary(getActionErrorMessage(error), "error");
  }
}

export async function approveLibraryDesignAction(formData: FormData): Promise<void> {
  try {
    const session = await requirePartnerWorkspace();
    if (!canModerateListings(session)) {
      redirectLibrary("Only the partner can approve designs.", "error");
    }
    const assetId = String(formData.get("assetId") ?? "").trim();
    if (!assetId) {
      redirectLibrary("Missing design.", "error");
    }

    await approveAsset({
      ventureId: session.ventureId,
      assetId,
      approvedById: session.appUser.id,
    });

    revalidatePath("/partner/library");
    revalidatePath("/studio");
    redirectLibrary("Design approved for Studio.", "success");
  } catch (error) {
    if (isNextRedirect(error)) throw error;
    redirectLibrary(getActionErrorMessage(error), "error");
  }
}

export async function saveCanvasCompositionAction(formData: FormData): Promise<void> {
  try {
    const session = await requirePartnerWorkspace();
    const name = String(formData.get("name") ?? "").trim() || "Canvas composition";
    const file = formData.get("file");

    if (!(file instanceof File) || file.size === 0) {
      redirect(`/partner/canvas?error=${encodeURIComponent("Export failed — try again.")}`);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    await uploadPartnerDesign({
      ventureId: session.ventureId,
      ventureSlug: session.ventureSlug,
      uploadedById: session.appUser.id,
      name,
      notes: "Composed on blank in partner canvas",
      file: buffer,
      filename: file.name || "composition.png",
      mimeType: file.type || "image/png",
      autoApprove: canModerateListings(session),
    });

    revalidatePath("/partner/library");
    revalidatePath("/partner/canvas");
    revalidatePath("/studio");
    redirect(
      `/partner/library?success=${encodeURIComponent("Composition saved to your library.")}`,
    );
  } catch (error) {
    if (isNextRedirect(error)) throw error;
    redirect(
      `/partner/canvas?error=${encodeURIComponent(getActionErrorMessage(error))}`,
    );
  }
}
