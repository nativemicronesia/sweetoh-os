"use server";

import { redirect } from "next/navigation";
import { isAiProductBuilderConfigured } from "@/lib/config/env";
import {
  createPieProductDraft,
  describePieInputMode,
  resolvePieInputMode,
} from "@/lib/domains/intelligence/pie";
import { requirePartnerWorkspace } from "@/lib/domains/identity/service";
import { getActionErrorMessage } from "@/lib/shared/action-errors";

const PIE_PATH = "/partner/intelligence";

function redirectPartnerPieError(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

export async function generatePartnerPieDraftAction(
  formData: FormData,
): Promise<void> {
  if (!isAiProductBuilderConfigured()) {
    redirectPartnerPieError(
      PIE_PATH,
      "Product Intelligence Engine is not ready. Add OPENAI_API_KEY or AI_MOCK_MODE=true to .env.local.",
    );
  }

  try {
    const session = await requirePartnerWorkspace();
    const textPrompt = String(formData.get("textPrompt") ?? formData.get("prompt") ?? "").trim();

    const product = await createPieProductDraft({
      ventureId: session.ventureId,
      ventureSlug: session.ventureSlug,
      actorUserId: session.appUser.id,
      textPrompt,
    });

    redirect(
      `/partner/drafts/${product.id}?success=${encodeURIComponent(
        `Draft "${product.name}" is ready. Review the listing, set the price, then publish.`,
      )}`,
    );
  } catch (error) {
    redirectPartnerPieError(PIE_PATH, getActionErrorMessage(error));
  }
}

export async function generatePartnerVisualIntakeDraftAction(
  formData: FormData,
): Promise<void> {
  return generatePartnerPieIntakeAction(formData);
}

export async function generatePartnerPieIntakeAction(
  formData: FormData,
): Promise<void> {
  if (!isAiProductBuilderConfigured()) {
    redirectPartnerPieError(
      "/partner/visual-intake",
      "Product Intelligence Engine is not ready. Add OPENAI_API_KEY or AI_MOCK_MODE=true to .env.local.",
    );
  }

  try {
    const session = await requirePartnerWorkspace();
    const textPrompt =
      String(formData.get("textPrompt") ?? formData.get("operatorNotes") ?? formData.get("prompt") ?? "").trim() ||
      null;
    const file = formData.get("file");
    const hasImage = file instanceof File && file.size > 0;

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
      });
    } else {
      product = await createPieProductDraft({
        ventureId: session.ventureId,
        ventureSlug: session.ventureSlug,
        actorUserId: session.appUser.id,
        textPrompt,
      });
    }

    redirect(
      `/partner/drafts/${product.id}?success=${encodeURIComponent(
        `Draft "${product.name}" created (${describePieInputMode(mode)}). Review, set price, then publish.`,
      )}`,
    );
  } catch (error) {
    const file = formData.get("file");
    const hasImage = file instanceof File && file.size > 0;
    redirectPartnerPieError(
      hasImage ? "/partner/visual-intake" : PIE_PATH,
      getActionErrorMessage(error),
    );
  }
}

/** @deprecated Use generatePartnerPieDraftAction or generatePartnerPieIntakeAction */
export async function generatePartnerProductDraftAction(
  formData: FormData,
): Promise<void> {
  return generatePartnerPieDraftAction(formData);
}

/** @deprecated Use generatePartnerPieIntakeAction */
export async function generatePartnerSweetOhAiDraftAction(
  formData: FormData,
): Promise<void> {
  return generatePartnerPieIntakeAction(formData);
}
