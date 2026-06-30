export const STUDIO_PROJECT_STATUSES = [
  "new",
  "reviewing",
  "approved",
  "in_production",
  "completed",
] as const;

export type StudioProjectStatus = (typeof STUDIO_PROJECT_STATUSES)[number];

export const STUDIO_PROJECT_STATUS_LABELS: Record<StudioProjectStatus, string> = {
  new: "New",
  reviewing: "Reviewing",
  approved: "Approved",
  in_production: "In Production",
  completed: "Completed",
};

export function formatStudioProjectStatus(status: string): string {
  if (status in STUDIO_PROJECT_STATUS_LABELS) {
    return STUDIO_PROJECT_STATUS_LABELS[status as StudioProjectStatus];
  }

  return status.replaceAll("_", " ");
}

export type StudioProjectAssetRole = "reference" | "production" | "mockup";
