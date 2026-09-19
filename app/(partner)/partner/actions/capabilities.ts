"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import OpenAI from "openai";
import { z } from "zod";
import { requirePartnerWorkspace } from "@/lib/domains/identity/service";
import {
  addInspiration,
  createOwnBlank,
  editDesign,
  generateDesign,
  listInspiration,
  removeBackground,
  turnPhotoIntoBlank,
  PRODUCT_TYPE_OPTIONS,
  type BlankProposal,
} from "@/lib/capabilities";
import { areaSchema } from "@/lib/domains/catalog/studio-layout";
import { variantColorSchema } from "@/lib/domains/catalog/variants";
import { ValidationError } from "@/lib/shared/errors";

type Result<T> = ({ ok: true } & T) | { ok: false; error: string };

function failure(error: unknown): { ok: false; error: string } {
  if (error instanceof ValidationError) return { ok: false, error: error.message };
  if (error instanceof z.ZodError) return { ok: false, error: "Some details look off. Check them and try again." };
  if (error instanceof OpenAI.APIError) {
    console.error("studio_capability_ai_failed", { status: error.status, code: error.code });
    if (error.status === 429) return { ok: false, error: "AI is busy right now. Try again in a minute; your work is saved." };
    return { ok: false, error: "The AI step didn’t finish. Try again shortly; your work is saved." };
  }
  console.error("studio_capability_failed", error instanceof Error ? error.message : error);
  return { ok: false, error: "That didn’t work. Try again; your work is saved." };
}

const productTypes = PRODUCT_TYPE_OPTIONS.map((t) => t.value) as [string, ...string[]];

export async function turnPhotoIntoBlankAction(form: FormData): Promise<Result<{ proposal: BlankProposal }>> {
  const session = await requirePartnerWorkspace();
  try {
    const files = form.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);
    const labels = form.getAll("labels").map(String);
    const typeHint = z.enum(productTypes).nullable().catch(null).parse(form.get("typeHint") || null);
    const proposal = await turnPhotoIntoBlank(session, {
      photos: await Promise.all(
        files.map(async (f, i) => ({ file: Buffer.from(await f.arrayBuffer()), mimeType: f.type, label: labels[i]?.slice(0, 40) || (i === 0 ? "Front" : `View ${i + 1}`) })),
      ),
      typeHint: typeHint as never,
    });
    return { ok: true, proposal };
  } catch (error) {
    return failure(error);
  }
}

const blankInput = z.object({
  name: z.string().min(1).max(180),
  productType: z.enum(productTypes),
  colors: z.array(variantColorSchema).max(30),
  sizes: z.array(z.string().max(30)).max(20),
  views: z
    .array(
      z.object({
        label: z.string().max(60),
        position: z.string().max(40),
        assetId: z.string().uuid(),
        originalAssetId: z.string().uuid(),
        area: areaSchema,
        printWidthIn: z.number().min(0.5).max(120),
        printHeightIn: z.number().min(0.5).max(120),
      }),
    )
    .min(1)
    .max(4),
});

export async function createOwnBlankAction(input: unknown): Promise<{ ok: false; error: string } | void> {
  const session = await requirePartnerWorkspace();
  let id: string;
  try {
    id = await createOwnBlank(session, blankInput.parse(input) as never);
    revalidatePath("/partner/catalog");
    revalidatePath("/partner/products");
  } catch (error) {
    return failure(error);
  }
  redirect(`/partner/canvas?blank=${id}`);
}

type Design = { assetId: string; name: string; previewUrl: string };

export async function removeBackgroundAction(assetId: string): Promise<Result<Design & { method: string }>> {
  const session = await requirePartnerWorkspace();
  try {
    const result = await removeBackground(session, z.string().uuid().parse(assetId));
    revalidatePath("/partner/library");
    return { ok: true, ...result };
  } catch (error) {
    return failure(error);
  }
}

export async function editDesignAction(assetId: string, instruction: string): Promise<Result<Design>> {
  const session = await requirePartnerWorkspace();
  try {
    const result = await editDesign(session, z.string().uuid().parse(assetId), instruction);
    revalidatePath("/partner/library");
    return { ok: true, ...result };
  } catch (error) {
    return failure(error);
  }
}

export async function generateDesignAction(input: { brief: string; seamless?: boolean; referenceAssetId?: string | null }): Promise<Result<Design>> {
  const session = await requirePartnerWorkspace();
  try {
    const result = await generateDesign(session, {
      brief: input.brief,
      seamless: Boolean(input.seamless),
      referenceAssetId: input.referenceAssetId ? z.string().uuid().parse(input.referenceAssetId) : null,
    });
    revalidatePath("/partner/library");
    return { ok: true, ...result };
  } catch (error) {
    return failure(error);
  }
}

export async function addInspirationAction(form: FormData): Promise<Result<{ item: { id: string; name: string; previewUrl: string } }>> {
  const session = await requirePartnerWorkspace();
  try {
    const file = form.get("photo");
    if (!(file instanceof File) || !file.size) throw new ValidationError("Choose an image.");
    const saved = await addInspiration(session, { bytes: Buffer.from(await file.arrayBuffer()), name: file.name, mimeType: file.type });
    return { ok: true, item: { id: saved.assetId, name: saved.name, previewUrl: saved.previewUrl } };
  } catch (error) {
    return failure(error);
  }
}

export async function listInspirationAction(): Promise<Result<{ items: { id: string; name: string; previewUrl: string }[] }>> {
  const session = await requirePartnerWorkspace();
  try {
    return { ok: true, items: await listInspiration(session) };
  } catch (error) {
    return failure(error);
  }
}
