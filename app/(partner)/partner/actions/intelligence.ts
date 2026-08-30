"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isAiProductBuilderConfigured } from "@/lib/config/env";
import { canModerateListings } from "@/lib/domains/catalog/partner-listings";
import {
  createPieProductDraft,
  describePieInputMode,
  resolvePieInputMode,
} from "@/lib/domains/intelligence/pie";
import { requirePartnerWorkspace } from "@/lib/domains/identity/service";
import { getActionErrorMessage } from "@/lib/shared/action-errors";

const CREATE_PATH = "/partner/create";

function isNextRedirect(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    String((error as { digest?: unknown }).digest).startsWith("NEXT_REDIRECT")
  );
}

function redirectPartnerPieError(message: string): never {
  redirect(`${CREATE_PATH}?error=${encodeURIComponent(message)}`);
}

/** Text-only draft lane on /partner/create. */
export async function generatePartnerPieDraftAction(
  formData: FormData,
): Promise<void> {
  if (!isAiProductBuilderConfigured()) {
    redirectPartnerPieError(
      "Product Intelligence Engine is not ready. Add OPENAI_API_KEY or AI_MOCK_MODE=true to .env.local.",
    );
  }

  try {
    const session = await requirePartnerWorkspace();
    const textPrompt = String(
      formData.get("textPrompt") ?? formData.get("prompt") ?? "",
    ).trim();

    const product = await createPieProductDraft({
      ventureId: session.ventureId,
      ventureSlug: session.ventureSlug,
      actorUserId: session.appUser.id,
      textPrompt,
      libraryAutoApprove: canModerateListings(session),
    });

    redirect(
      `/partner/review/${product.id}?success=${encodeURIComponent(
        `Draft "${product.name}" is ready. Review the listing, set the price, then publish.`,
      )}`,
    );
  } catch (error) {
    if (isNextRedirect(error)) throw error;
    redirectPartnerPieError(getActionErrorMessage(error));
  }
}

/** Photo (optionally + notes) draft lane on /partner/create. */
export async function generatePartnerPieIntakeAction(
  formData: FormData,
): Promise<void> {
  if (!isAiProductBuilderConfigured()) {
    redirectPartnerPieError(
      "Product Intelligence Engine is not ready. Add OPENAI_API_KEY or AI_MOCK_MODE=true to .env.local.",
    );
  }

  try {
    const session = await requirePartnerWorkspace();
    const textPrompt =
      String(
        formData.get("textPrompt") ??
          formData.get("operatorNotes") ??
          formData.get("prompt") ??
          "",
      ).trim() || null;
    const file = formData.get("file");
    const hasImage = file instanceof File && file.size > 0;
    const libraryAutoApprove = canModerateListings(session);

    const mode = resolvePieInputMode({ textPrompt, hasImage });

    let product;

    if (hasImage) {
      const uploadFile = file as File;
      product = await createPieProductDraft({
        ventureId: session.ventureId,
        ventureSlug: session.ventureSlug,
        actorUserId: session.appUser.id,
        textPrompt,
        file: {
          buffer: Buffer.from(await uploadFile.arrayBuffer()),
          filename: uploadFile.name,
          mimeType: uploadFile.type || "image/jpeg",
        },
        libraryAutoApprove,
      });
    } else {
      product = await createPieProductDraft({
        ventureId: session.ventureId,
        ventureSlug: session.ventureSlug,
        actorUserId: session.appUser.id,
        textPrompt,
        libraryAutoApprove,
      });
    }

    revalidatePath("/partner/library");
    revalidatePath("/studio");
    revalidatePath("/partner/canvas");

    const libraryNote = hasImage
      ? libraryAutoApprove
        ? " Artwork also saved to your Design library for Studio."
        : " Artwork saved to Design library as a draft — approve it for Studio."
      : "";

    redirect(
      `/partner/review/${product.id}?success=${encodeURIComponent(
        `Draft "${product.name}" created (${describePieInputMode(
          mode,
        )}). Review, set price, then publish.${libraryNote}`,
      )}`,
    );
  } catch (error) {
    if (isNextRedirect(error)) throw error;
    redirectPartnerPieError(getActionErrorMessage(error));
  }
}
