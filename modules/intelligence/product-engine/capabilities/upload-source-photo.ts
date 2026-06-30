import { uploadToProductEngineBucket } from "../storage/client";
import { productIntelligenceObjectKey, PRODUCT_ENGINE_BUCKET } from "../storage/paths";
import type { StoredImage } from "../types";

export async function uploadSourcePhoto(input: {
  productType: string;
  file: Buffer | Uint8Array;
  filename: string;
  mimeType: string;
}): Promise<StoredImage> {
  const assetId = crypto.randomUUID();
  const objectKey = productIntelligenceObjectKey(
    input.productType,
    assetId,
    input.filename,
  );

  await uploadToProductEngineBucket({
    objectKey,
    body: input.file,
    contentType: input.mimeType,
  });

  return { bucket: PRODUCT_ENGINE_BUCKET, objectKey };
}
