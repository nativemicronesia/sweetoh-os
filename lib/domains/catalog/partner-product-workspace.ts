import type { ProductDraftStatus } from "./draft-status";

export type PartnerProductWorkspaceState =
  | "private"
  | "ready"
  | "live"
  | "review"
  | "blank"
  | "archived";

export function partnerProductWorkspaceLabel(state: PartnerProductWorkspaceState): string {
  switch (state) {
    case "private": return "Private draft · not live";
    case "ready": return "Ready to publish";
    case "live": return "Live in shop";
    case "review": return "Review status";
    case "blank": return "Saved blank";
    case "archived": return "Archived";
  }
}

export function partnerProductWorkspaceState(input: {
  active: boolean;
  draftStatus: ProductDraftStatus;
  isBlank: boolean;
}): PartnerProductWorkspaceState {
  if (input.draftStatus === "archived") return "archived";
  if (input.active) return "live";
  if (input.isBlank) return "blank";
  if (input.draftStatus === "approved") return "ready";
  if (input.draftStatus === "draft" || input.draftStatus === "needs_work") return "private";
  return "review";
}

export function partnerProductNextAction(input: {
  id: string;
  state: PartnerProductWorkspaceState;
  confirmedBlank: boolean;
}): { href: string; label: string } {
  const review = `/partner/review/${input.id}`;
  switch (input.state) {
    case "private":
      return { href: review, label: "Continue editing" };
    case "ready":
      return { href: review, label: "Review readiness & publish" };
    case "live":
      return { href: review, label: "Inspect live & manage" };
    case "review":
      return { href: review, label: "Review status" };
    case "blank":
      return input.confirmedBlank
        ? { href: `/partner/canvas?blank=${input.id}`, label: "Continue designing" }
        : { href: review, label: "Continue setup" };
    case "archived":
      return { href: review, label: "View archived product" };
  }
}
