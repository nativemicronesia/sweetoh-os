export type AssetStatus = "draft" | "approved" | "archived" | "licensed";

export type AssetAuthority = "canonical" | "derived" | "licensed";

export type AssetType =
  | "character"
  | "book"
  | "illustration"
  | "sweetoh_design"
  | "product_asset"
  | "brand"
  | "educational"
  | "media"
  | "creator";

export function isApprovedAssetStatus(status: AssetStatus): boolean {
  return status === "approved" || status === "licensed";
}
