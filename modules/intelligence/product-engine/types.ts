export type BoundingBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type PlacementRegion = {
  label: string;
  boundingBox: BoundingBox;
};

export type StoredImage = {
  bucket: string;
  objectKey: string;
};

export type ProductIntelligenceTemplate = {
  id: string;
  productType: string;
  mockupBaseImage: StoredImage;
  placementRegions: PlacementRegion[];
  safeZones: PlacementRegion[];
  printableAreas: PlacementRegion[];
  createdAt: Date;
};

export type NewProductIntelligenceTemplate = {
  productType: string;
  mockupBaseImage: StoredImage;
  placementRegions: PlacementRegion[];
  safeZones: PlacementRegion[];
  printableAreas: PlacementRegion[];
};

export type ProductTypeIdentification = {
  productType: string;
  confidence: number;
};

export type ProductIntakeResult =
  | {
      status: "template_matched";
      productType: string;
      sourceImage: StoredImage;
      template: ProductIntelligenceTemplate;
    }
  | {
      status: "template_needed";
      productType: string;
      sourceImage: StoredImage;
    };
