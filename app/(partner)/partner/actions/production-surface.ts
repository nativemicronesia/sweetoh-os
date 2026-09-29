"use server";

import sharp from "sharp";
import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { z } from "zod";
import { requirePartnerWorkspace } from "@/lib/domains/identity/service";
import { getActorProductDraft } from "@/lib/domains/intelligence/service";
import { builderRecord } from "@/lib/domains/intelligence/product-research-schema";
import { approveAsset, createAssetWithUpload, validateImageUpload } from "@/lib/domains/assets/service";
import { getProductById, setProductPrintArea } from "@/lib/domains/catalog/service";
import { areaSchema, PRODUCTION_BLANK_ASSET_NOTES, surfaceSchema } from "@/lib/domains/catalog/studio-layout";
import { CONFIRMED_SHOP_METHODS } from "@/lib/domains/production/methods";
import { ValidationError } from "@/lib/shared/errors";

const uuid = z.string().uuid();

/** Partner-confirmed transparent blank plus partner-entered production geometry. */
type AttachSurfaceState = { ok?: boolean; error?: string };

export async function attachProductionSurfaceAction(_previous: AttachSurfaceState, form: FormData): Promise<AttachSurfaceState> {
  const session = await requirePartnerWorkspace();
  try {
  const productId = uuid.parse(form.get("productId"));
  const owned = await getActorProductDraft({ ventureId: session.ventureId, actorUserId: session.appUser.id, productId });
  if (!owned || owned.product.active || !["draft", "needs_work", "pending_review", "approved"].includes(owned.product.draftStatus)
    || owned.product.fulfillmentType !== "sweetoh" || builderRecord(owned.session?.rawResponse)?.purpose === "blank") {
    throw new ValidationError("Choose one of your editable private product drafts.");
  }

  const file = form.get("photo");
  if (!(file instanceof File) || !file.size) throw new ValidationError("Choose a transparent PNG of the undecorated product.");
  if (file.type !== "image/png") throw new ValidationError("Upload a transparent PNG production blank.");
  if (form.get("confirmBlank") !== "on") throw new ValidationError("Confirm that this is the real undecorated product blank used in production.");
  validateImageUpload({ mimeType: file.type, sizeBytes: file.size });
  const bytes = Buffer.from(await file.arrayBuffer());
  const metadata = await sharp(bytes, { limitInputPixels: 40_000_000 }).metadata();
  if (metadata.format !== "png" || !metadata.hasAlpha || !metadata.width || !metadata.height) {
    throw new ValidationError("This file has no transparency channel. Upload the clean cutout you use for production.");
  }
  const { data: alpha, info } = await sharp(bytes).ensureAlpha().extractChannel("alpha").raw().toBuffer({ resolveWithObject: true });
  let transparentPixels = 0;
  for (const value of alpha) if (value < 250) transparentPixels++;
  if (transparentPixels / (info.width * info.height) < 0.005) {
    throw new ValidationError("The PNG background is not transparent enough to verify a clean blank.");
  }

  const area = areaSchema.parse({
    x: Number(form.get("areaX")) / 100, y: Number(form.get("areaY")) / 100,
    width: Number(form.get("areaWidth")) / 100, height: Number(form.get("areaHeight")) / 100,
  });
  const unit = z.enum(["in", "cm"]).parse(form.get("dimensionUnit"));
  const dimensions = {
    width: z.coerce.number().positive().max(1200).parse(form.get("printWidth")),
    height: z.coerce.number().positive().max(1200).parse(form.get("printHeight")),
    unit,
  };
  const position = z.string().trim().min(1).max(40).parse(form.get("position"));
  const surfaceName = z.string().trim().min(1).max(60).parse(form.get("surfaceName"));
  const region = {
    id: `partner-print-${crypto.randomUUID().slice(0, 8)}`,
    name: z.string().trim().min(1).max(60).parse(form.get("regionName")),
    productionMethod: z.enum(CONFIRMED_SHOP_METHODS).parse(form.get("productionMethod")),
    bounds: area, shape: "rectangle" as const, dimensions,
  };
  const existingProduct = await getProductById({ ventureId: session.ventureId, productId });
  const oldSurfaces = existingProduct.printArea?.surfaces ?? [];
  const matchingIndex = oldSurfaces.findIndex(surface => surface.position?.toLowerCase() === position.toLowerCase());
  const prior = matchingIndex >= 0 ? oldSurfaces[matchingIndex] : null;
  if (prior?.imageRole === "production_blank") throw new ValidationError("This view already has a production blank. Use the existing surface unless the partner replaces it deliberately.");

  const asset = await createAssetWithUpload({
    ventureId: session.ventureId, ventureSlug: session.ventureSlug, uploadedById: session.appUser.id,
    name: `${existingProduct.name} — ${surfaceName} production blank`, assetType: "product_asset",
    file: bytes, filename: file.name || "production-blank.png", mimeType: "image/png",
    notes: PRODUCTION_BLANK_ASSET_NOTES,
  });
  await approveAsset({ ventureId: session.ventureId, assetId: asset.id, approvedById: session.appUser.id });
  const nextSurface = surfaceSchema.parse({
    id: prior?.id ?? `${position.toLowerCase().replace(/[^a-z0-9_-]/g, "-")}-${crypto.randomUUID().slice(0, 6)}`,
    name: surfaceName, position, assetId: asset.id,
    referenceAssetId: prior?.referenceAssetId ?? prior?.assetId ?? null,
    imageRole: "production_blank", imageUrl: null, area, printRegions: [region], layers: [],
  });
  const surfaces = oldSurfaces.slice();
  if (matchingIndex >= 0) surfaces[matchingIndex] = { ...prior, ...nextSurface };
  else surfaces.push(nextSurface);
  await setProductPrintArea({
    ventureId: session.ventureId, productId,
    printArea: { x: surfaces[0].area.x, y: surfaces[0].area.y, width: surfaces[0].area.width, height: surfaces[0].area.height, surfaces },
  });
  revalidatePath(`/partner/review/${productId}`);
  revalidatePath("/partner/products");
  revalidatePath("/partner/canvas");
  return { ok: true };
  } catch (error) {
    unstable_rethrow(error);
    return { error: error instanceof ValidationError ? error.message : "Couldn’t save this production surface. Check the file and geometry, then try again." };
  }
}
