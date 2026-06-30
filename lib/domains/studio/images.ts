import { getAssetPreviewUrl } from "@/lib/domains/assets/service";
import { getStudioProjectById } from "./service";
import type { StudioProjectAssetRole } from "./types";

export type StudioProjectImage = {
  assetId: string;
  role: StudioProjectAssetRole;
  name: string;
  previewUrl: string;
};

export const STUDIO_PROJECT_ASSET_ROLE_LABELS: Record<
  StudioProjectAssetRole,
  string
> = {
  reference: "Customer reference",
  production: "Production",
  mockup: "Mockup",
};

export function formatStudioProjectAssetRoleLabel(
  role: StudioProjectAssetRole | string,
): string {
  if (role in STUDIO_PROJECT_ASSET_ROLE_LABELS) {
    return STUDIO_PROJECT_ASSET_ROLE_LABELS[role as StudioProjectAssetRole];
  }

  return role.replaceAll("_", " ");
}

export function partitionStudioProjectImagesByJobRole(
  images: StudioProjectImage[],
) {
  return {
    reference: images.filter((image) => image.role === "reference"),
    production: images.filter((image) => image.role === "production"),
    mockup: images.filter((image) => image.role === "mockup"),
  };
}

export type JobRoleSection = {
  role: StudioProjectAssetRole;
  title: string;
  description: string;
  images: StudioProjectImage[];
  order: number;
};

export function getJobRoleSections(images: StudioProjectImage[]): JobRoleSection[] {
  const partitioned = partitionStudioProjectImagesByJobRole(images);

  return [
    {
      role: "reference",
      title: "Customer reference",
      description: "Reference images from the customer or linked library assets.",
      images: partitioned.reference,
      order: 1,
    },
    {
      role: "production",
      title: "Production images",
      description: "Photos of finished or in-progress work for this job.",
      images: partitioned.production,
      order: 2,
    },
    {
      role: "mockup",
      title: "Mockups",
      description: "Preview comps and mockups linked to this job.",
      images: partitioned.mockup,
      order: 3,
    },
  ];
}

export async function getStudioProjectImages(input: {
  ventureId: string;
  projectId: string;
}): Promise<StudioProjectImage[]> {
  const { links } = await getStudioProjectById(input);

  const images = await Promise.all(
    links.map(async ({ link, asset }) => ({
      assetId: asset.id,
      role: link.role,
      name: asset.name,
      previewUrl: await getAssetPreviewUrl({
        bucket: asset.bucket,
        objectKey: asset.objectKey,
      }),
    })),
  );

  return images;
}
