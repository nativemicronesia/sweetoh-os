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

const CREATE_PATH = "/partner/create";

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
    });

    redirect(
      `/partner/review/${product.id}?success=${encodeURIComponent(
        `Draft "${product.name}" is ready. Review the listing, set the price, then publish.`,
      )}`,
    );
  } catch (error) {
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
      `/partner/review/${product.id}?success=${encodeURIComponent(
        `Draft "${product.name}" created (${describePieInputMode(
          mode,
        )}). Review, set price, then publish.`,
      )}`,
    );
  } catch (error) {
    redirectPartnerPieError(getActionErrorMessage(error));
  }
}
