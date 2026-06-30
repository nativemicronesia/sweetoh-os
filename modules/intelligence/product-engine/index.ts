export type {
  BoundingBox,
  PlacementRegion,
  StoredImage,
  ProductIntelligenceTemplate,
  NewProductIntelligenceTemplate,
  ProductTypeIdentification,
  ProductIntakeResult,
} from "./types";

export { runProductIntake } from "./capabilities/run-intake";
export { saveTemplate } from "./capabilities/save-template";
export { findTemplateByProductType } from "./capabilities/find-template-by-product-type";
