export type ProductDraftStatus =
  | "draft"
  | "pending_review"
  | "needs_work"
  | "approved"
  | "published"
  | "rejected"
  | "archived";

export const PRODUCT_DRAFT_STATUS_LABELS: Record<ProductDraftStatus, string> = {
  draft: "Draft",
  pending_review: "Pending review",
  needs_work: "Needs work",
  approved: "Approved",
  published: "Published",
  rejected: "Rejected",
  archived: "Archived",
};

export const REVIEW_QUEUE_DRAFT_STATUSES: ProductDraftStatus[] = [
  "pending_review",
  "needs_work",
];

export const TERMINAL_DRAFT_STATUSES: ProductDraftStatus[] = [
  "rejected",
  "archived",
];

export function formatProductDraftStatus(status: ProductDraftStatus): string {
  return PRODUCT_DRAFT_STATUS_LABELS[status];
}

export function resolveInactiveDraftStatus(input: {
  hasAiSession: boolean;
  canPublish: boolean;
  currentStatus: ProductDraftStatus;
}): ProductDraftStatus {
  if (
    input.currentStatus === "rejected" ||
    input.currentStatus === "archived"
  ) {
    return input.currentStatus;
  }

  if (!input.hasAiSession) {
    return input.currentStatus === "approved" ? "approved" : "draft";
  }

  if (input.currentStatus === "draft") {
    return "draft";
  }

  if (input.currentStatus === "approved") {
    return input.canPublish ? "approved" : "needs_work";
  }

  return input.canPublish ? "pending_review" : "needs_work";
}

export function draftStatusBadgeClass(status: ProductDraftStatus): string {
  switch (status) {
    case "published":
      return "bg-emerald-100 text-emerald-800";
    case "approved":
      return "bg-blue-100 text-blue-900";
    case "pending_review":
      return "bg-amber-100 text-amber-900";
    case "needs_work":
      return "bg-orange-100 text-orange-900";
    case "rejected":
      return "bg-neutral-200 text-neutral-700";
    case "archived":
      return "bg-neutral-100 text-neutral-500";
    default:
      return "bg-neutral-100 text-neutral-600";
  }
}

export function displayProductDraftStatus(input: {
  active: boolean;
  draftStatus: ProductDraftStatus;
}): ProductDraftStatus {
  return input.active ? "published" : input.draftStatus;
}
