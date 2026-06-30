export type StorefrontSurface = "store" | "sweetoh";

/** Storefront paths that use Sweet'Oh branding (not Island Sprouts sender identity). */
const SWEETOH_STOREFRONT_PATHS = [
  "/sweetoh",
  "/create",
  "/collections/sweetoh-creations",
] as const;

export function isSweetohStorefrontPath(pathname: string): boolean {
  if (pathname.startsWith("/products/sweetoh-")) {
    return true;
  }

  return SWEETOH_STOREFRONT_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

export function getStorefrontSurface(pathname: string): StorefrontSurface {
  return isSweetohStorefrontPath(pathname) ? "sweetoh" : "store";
}
