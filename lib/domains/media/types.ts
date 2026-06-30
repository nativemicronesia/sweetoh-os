import type { AssetStatus, AssetType } from "@/lib/domains/assets/types";

export type MediaLibraryKind = "design_library" | "product_media";

export type MediaLibraryItem = {
  id: string;
  kind: MediaLibraryKind;
  name: string;
  bucket: string;
  objectKey: string;
  mimeType: string | null;
  fileSizeBytes: number | null;
  createdAt: Date;
  assetType?: AssetType;
  assetStatus?: AssetStatus;
  notes?: string | null;
  productId?: string;
  productName?: string;
  productSlug?: string;
  linkedAssetId?: string | null;
  sortOrder?: number;
};

export type MediaLibraryFilters = {
  kind?: MediaLibraryKind | "all";
  status?: AssetStatus;
  mimePrefix?: string;
  query?: string;
};

export type MediaLibraryStats = {
  total: number;
  designLibraryCount: number;
  productMediaCount: number;
  imageCount: number;
  draftAssetCount: number;
};
