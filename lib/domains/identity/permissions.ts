import type { AppRole } from "./types";

export const PERMISSIONS = {
  AUTH_SESSION: "auth:session",
  OWNER_ALL: "owner:*",
  PARTNER_ACCESS: "partner:access",
  PARTNER_SWEETOH_READ: "partner:sweetoh:read",
  PARTNER_SWEETOH_WRITE: "partner:sweetoh:write",
  PARTNER_AI_BUILDER_RUN: "partner:ai-builder:run",
} as const;

const PARTNER_PERMISSIONS = new Set<string>([
  PERMISSIONS.PARTNER_ACCESS,
  PERMISSIONS.PARTNER_SWEETOH_READ,
  PERMISSIONS.PARTNER_SWEETOH_WRITE,
  PERMISSIONS.PARTNER_AI_BUILDER_RUN,
]);

export function hasPermission(role: AppRole, permission: string): boolean {
  if (role === "owner") return true;
  // Creators work in their own Create with Sweet'Oh workspace, never the
  // partner back office.
  if (role === "creator") return false;
  if (permission.startsWith("partner:sweetoh:")) {
    return PARTNER_PERMISSIONS.has(permission);
  }
  return PARTNER_PERMISSIONS.has(permission);
}
