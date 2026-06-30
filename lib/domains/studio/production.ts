import {
  createAssetWithUpload,
  validateImageUpload,
} from "@/lib/domains/assets/service";
import { ValidationError } from "@/lib/shared/errors";
import { isPartnerProductionJobStatus } from "./customer-request";
import { addStudioProjectAsset, getStudioProjectById } from "./service";

export async function uploadStudioJobProductionImage(input: {
  ventureId: string;
  ventureSlug: string;
  projectId: string;
  uploadedByUserId: string;
  file: Buffer;
  filename: string;
  mimeType: string;
  requirePartnerProductionStatus?: boolean;
}) {
  validateImageUpload({
    mimeType: input.mimeType,
    sizeBytes: input.file.length,
  });

  const { project } = await getStudioProjectById({
    ventureId: input.ventureId,
    projectId: input.projectId,
  });

  if (
    input.requirePartnerProductionStatus &&
    !isPartnerProductionJobStatus(project.status)
  ) {
    throw new ValidationError(
      "Only approved or in-production jobs accept product images.",
    );
  }

  const asset = await createAssetWithUpload({
    ventureId: input.ventureId,
    ventureSlug: input.ventureSlug,
    uploadedById: input.uploadedByUserId,
    name: input.filename,
    assetType: "product_asset",
    file: input.file,
    filename: input.filename,
    mimeType: input.mimeType,
    notes: `Production image for studio job ${input.projectId}`,
  });

  await addStudioProjectAsset({
    ventureId: input.ventureId,
    projectId: input.projectId,
    assetId: asset.id,
    role: "production",
    actorUserId: input.uploadedByUserId,
  });

  return { asset, project };
}
