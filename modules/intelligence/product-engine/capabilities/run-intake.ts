import { identifyProductType } from "../ai/identify-product-type";
import { uploadSourcePhoto } from "./upload-source-photo";
import { findTemplateByProductType } from "./find-template-by-product-type";
import type { ProductIntakeResult } from "../types";

/**
 * Step 1-3 of the PIE flow (see README.md): upload a photo, identify its
 * product type, and check whether a reusable template already exists.
 * Does not create a template -- that's `saveTemplate`, called by the
 * consumer once a human has defined placement regions (template_needed
 * case) or skipped entirely (template_matched case).
 */
export async function runProductIntake(input: {
  file: Buffer | Uint8Array;
  filename: string;
  mimeType: string;
}): Promise<ProductIntakeResult> {
  const imageBase64 = Buffer.from(input.file).toString("base64");

  const { productType } = await identifyProductType({
    imageBase64,
    mimeType: input.mimeType,
  });

  const sourceImage = await uploadSourcePhoto({
    productType,
    file: input.file,
    filename: input.filename,
    mimeType: input.mimeType,
  });

  const template = await findTemplateByProductType(productType);

  if (template) {
    return { status: "template_matched", productType, sourceImage, template };
  }

  return { status: "template_needed", productType, sourceImage };
}
