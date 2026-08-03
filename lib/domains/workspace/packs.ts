/**
 * Personalized workspace packs — Sweet'Oh Studio (shared POD network).
 *
 * Partner: Studio (Create · Print · Listings) + Ship — she prints & approves.
 * Creator: Studio Create/Submit loud — venture operators submit for her review.
 * Assist docks inside Studio. Personal shadow agent reserved on Home.
 */

import type { AppRole } from "@/lib/domains/identity/types";

export type StudioModeId = "create" | "print" | "listings";

export type WorkspaceNavItem = {
  id: string;
  label: string;
  href: string;
  matchPrefixes?: string[];
};

export type StudioMode = {
  id: StudioModeId;
  label: string;
  href: string;
  note: string;
};

export type WorkspacePack = {
  id: "sweetoh_partner" | "sweetoh_creator";
  label: string;
  roleLabel: string;
  tagline: string;
  primaryCta: { label: string; href: string; note: string };
  /** Modes shown on Studio hub (order matters). */
  studioModes: StudioMode[];
  /** Home desk cards — partner sees Print/Ship; creator emphasizes Create. */
  homeCards: StudioMode[];
  nav: WorkspaceNavItem[];
  showShipInNav: boolean;
  assist: {
    id: "sweetoh_ai";
    label: string;
    href: string;
    note: string;
  };
  agentSlot: {
    status: "reserved";
    label: string;
    note: string;
  };
};

const STUDIO_CREATE: StudioMode = {
  id: "create",
  label: "Create",
  href: "/partner/studio/create",
  note: "New piece — photo, builder, drafts",
};

const STUDIO_PRINT: StudioMode = {
  id: "print",
  label: "Print",
  href: "/partner/studio/print",
  note: "Jobs for any printer",
};

const STUDIO_LISTINGS: StudioMode = {
  id: "listings",
  label: "Listings",
  href: "/partner/studio/listings",
  note: "Drafts, pending review, live",
};

export const SWEETOH_PARTNER_PACK: WorkspacePack = {
  id: "sweetoh_partner",
  label: "Sweet'Oh Studio",
  roleLabel: "Partner",
  tagline:
    "Create, print, and ship for the NMH POD network. Sweet'Oh AI helps when you ask.",
  primaryCta: {
    label: "New piece",
    href: "/partner/visual-intake",
    note: "Snap a piece or start a draft — then print and list.",
  },
  studioModes: [STUDIO_CREATE, STUDIO_PRINT, STUDIO_LISTINGS],
  homeCards: [STUDIO_CREATE, STUDIO_PRINT, STUDIO_LISTINGS],
  nav: [
    { id: "home", label: "Home", href: "/partner" },
    {
      id: "studio",
      label: "Studio",
      href: "/partner/studio",
      matchPrefixes: [
        "/partner/studio",
        "/partner/visual-intake",
        "/partner/drafts",
        "/partner/products",
        "/partner/jobs",
        "/partner/uploads",
        "/partner/intelligence",
        "/partner/assist",
        "/partner/design",
      ],
    },
    {
      id: "ship",
      label: "Ship",
      href: "/partner/queue",
      matchPrefixes: ["/partner/queue"],
    },
  ],
  showShipInNav: true,
  assist: {
    id: "sweetoh_ai",
    label: "Sweet'Oh AI",
    href: "/partner/assist",
    note: "Seamless help on Create — listing prep, cleanup, ideas.",
  },
  agentSlot: {
    status: "reserved",
    label: "Your agent",
    note: "Your own AI avatar later — shadow for socials. Not Dekaz.",
  },
};

export const SWEETOH_CREATOR_PACK: WorkspacePack = {
  id: "sweetoh_creator",
  label: "Sweet'Oh Studio",
  roleLabel: "Creator",
  tagline:
    "Create designs and submit to Sweet'Oh for listing approval. Partner prints and ships.",
  primaryCta: {
    label: "New piece",
    href: "/partner/visual-intake",
    note: "Make something — then submit for Sweet'Oh review.",
  },
  studioModes: [STUDIO_CREATE, STUDIO_LISTINGS, STUDIO_PRINT],
  homeCards: [STUDIO_CREATE, STUDIO_LISTINGS],
  nav: [
    { id: "home", label: "Home", href: "/partner" },
    {
      id: "studio",
      label: "Studio",
      href: "/partner/studio",
      matchPrefixes: [
        "/partner/studio",
        "/partner/visual-intake",
        "/partner/drafts",
        "/partner/products",
        "/partner/jobs",
        "/partner/assist",
        "/partner/design",
      ],
    },
  ],
  showShipInNav: false,
  assist: SWEETOH_PARTNER_PACK.assist,
  agentSlot: {
    status: "reserved",
    label: "Your agent",
    note: "Venture creators use Sweet'Oh AI Assist for now. Personal agents come later.",
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
