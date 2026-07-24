/**
 * Sweet'Oh OS is a single-brand storefront. Path-based "room" branding from
 * Island Sprouts is not used here — every customer route is Sweet'Oh.
 */
export type StorefrontSurface = "sweetoh";

export function isSweetohStorefrontPath(_pathname: string): boolean {
  return true;
}

export function getStorefrontSurface(_pathname: string): StorefrontSurface {
  return "sweetoh";
}
