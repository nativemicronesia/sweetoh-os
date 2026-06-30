import { createClient } from "@supabase/supabase-js";
import { PRODUCT_ENGINE_BUCKET } from "./paths";

let adminClient: ReturnType<typeof createClient> | null = null;

function getAdminClient() {
  if (!adminClient) {
    adminClient = createClient(
      process.env.DEKAZ_SUPABASE_URL!,
      process.env.DEKAZ_SUPABASE_SERVICE_ROLE_KEY!,
    );
  }

  return adminClient;
}

export async function uploadToProductEngineBucket(input: {
  objectKey: string;
  body: Buffer | Uint8Array;
  contentType: string;
}) {
  const { error } = await getAdminClient()
    .storage.from(PRODUCT_ENGINE_BUCKET)
    .upload(input.objectKey, input.body, {
      contentType: input.contentType,
      upsert: false,
    });

  if (error) {
    throw error;
  }
}

export async function createProductEngineSignedUrl(input: {
  objectKey: string;
  expiresInSeconds?: number;
}) {
  const { data, error } = await getAdminClient()
    .storage.from(PRODUCT_ENGINE_BUCKET)
    .createSignedUrl(input.objectKey, input.expiresInSeconds ?? 3600);

  if (error) {
    throw error;
  }

  return data.signedUrl;
}
