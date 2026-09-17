/**
 * Personalized workspace packs — Sweet'Oh Command Center.
 *
 * The partner desk is one sidebar of five destinations (Overview · Create ·
 * Review · Orders · Products) plus Settings, with the persistent Studio chat
 * bar docked above the workspace. Creators see the same shape minus the
 * catalog/settings surfaces and without approve powers — the role gating that
 * actually enforces this lives in the Server Actions, this file only composes
 * navigation.
 */

import type { AppRole } from "@/lib/domains/identity/types";

export type PartnerSurfaceId =
  | "overview"
  | "create"
  | "review"
  | "orders"
  | "products"
  | "settings"
  | "canvas"
  | "library";

export type WorkspaceNavItem = {
  id: PartnerSurfaceId;
  label: string;
  href: string;
  /** One-line explanation, reused on the Overview to-do cards. */
  note: string;
  matchPrefixes?: string[];
};

export type WorkspacePack = {
  id: "sweetoh_partner" | "sweetoh_creator";
  label: string;
  roleLabel: string;
  tagline: string;
  primaryCta: { label: string; href: string; note: string };
  /** Left sidebar, in order. */
  nav: WorkspaceNavItem[];
  /** Overview to-do cards — the subset of nav that carries a live count. */
  homeCards: WorkspaceNavItem[];
  agentSlot: {
    status: "reserved";
    label: string;
    note: string;
  };
};

const NAV_OVERVIEW: WorkspaceNavItem = {
  id: "overview",
  label: "My workspace",
  href: "/partner",
  note: "What needs you today",
};

const NAV_CREATE: WorkspaceNavItem = {
  id: "create",
  label: "Create",
  href: "/partner/create",
  note: "New piece — photo or description",
  matchPrefixes: ["/partner/create", "/partner/builder", "/partner/visual-intake", "/partner/intelligence"],
};

const NAV_REVIEW: WorkspaceNavItem = {
  id: "review",
  label: "Listings",
  href: "/partner/review",
  note: "Listings waiting on a decision",
  matchPrefixes: ["/partner/review", "/partner/drafts", "/partner/studio/print"],
};

const NAV_ORDERS: WorkspaceNavItem = {
  id: "orders",
  label: "Orders",
  href: "/partner/orders",
  note: "Custom jobs and catalog orders",
  matchPrefixes: ["/partner/orders", "/partner/jobs", "/partner/queue"],
};

const NAV_PRODUCTS: WorkspaceNavItem = {
  id: "products",
  label: "Products",
  href: "/partner/products",
  note: "Your live catalog",
  matchPrefixes: [
    "/partner/products",
    "/partner/uploads",

  ],
};

const NAV_SETTINGS: WorkspaceNavItem = {
  id: "settings",
  label: "Settings",
  href: "/partner/settings",
  note: "Profile and workspace details",
};

export const SWEETOH_PARTNER_PACK: WorkspacePack = {
  id: "sweetoh_partner",
  label: "Sweet'Oh Studio",
  roleLabel: "Partner",
  tagline:
    "Your products, your creativity, your shop. Prepare a blank, make a design, and bring it to life.",
  primaryCta: {
    label: "New piece",
    href: "/partner/create",
    note: "Snap a photo or describe it — Sweet'Oh AI drafts the listing.",
  },
  nav: [
    NAV_OVERVIEW,
    NAV_CREATE,
    { id: "canvas", label: "Design studio", href: "/partner/canvas", note: "Create on your blanks" },
    { id: "library", label: "Artwork library", href: "/partner/library", note: "Your reusable designs" },
    NAV_REVIEW,
    NAV_ORDERS,
    NAV_PRODUCTS,
    NAV_SETTINGS,
  ],
  homeCards: [NAV_CREATE, NAV_REVIEW, NAV_ORDERS],
  agentSlot: {
    status: "reserved",
    label: "Your agent",
    note: "Her personal AI avatar — separate from Sweet'Oh AI, for anything outside the business. Reserved, not built yet.",
  },
};

export const SWEETOH_CREATOR_PACK: WorkspacePack = {
  id: "sweetoh_creator",
  label: "Sweet'Oh Studio",
  roleLabel: "Creator",
  tagline:
    "Create designs and submit them to Sweet'Oh for listing approval. The partner prints and ships.",
  primaryCta: {
    label: "New piece",
    href: "/partner/create",
    note: "Make something — then submit it for Sweet'Oh review.",
  },
  nav: [NAV_OVERVIEW, NAV_CREATE, NAV_REVIEW, NAV_ORDERS],
  homeCards: [NAV_CREATE, NAV_REVIEW, NAV_ORDERS],
  agentSlot: {
    status: "reserved",
    label: "Your agent",
    note: "Venture creators share the Sweet'Oh Studio chat for now. Personal agents come later.",
  },
};

/** Resolve which pack a session sees in /partner. */
export function resolvePartnerWorkspacePack(input: {
  role: AppRole;
  ventureSlug: string;
}): WorkspacePack {
  if (input.role === "creator") {
    return SWEETOH_CREATOR_PACK;
  }
  // Owners use the partner desk (approve + print) until a dedicated owner OS ships.
  return SWEETOH_PARTNER_PACK;
}

export function isNavItemActive(path: string, item: WorkspaceNavItem): boolean {
  if (item.href === "/partner") {
    return path === "/partner";
  }
  if (path === item.href || path.startsWith(`${item.href}/`)) {
    return true;
  }
  return (item.matchPrefixes ?? []).some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );
}
