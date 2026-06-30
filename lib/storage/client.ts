import { createAdminClient } from "@/lib/auth/supabase/admin";
import { getPublicEnv } from "@/lib/config/env";
import { STORAGE_BUCKETS } from "@/lib/storage/paths";

export async function uploadToBucket(input: {
  bucket: string;
  objectKey: string;
  body: Buffer | Uint8Array;
  contentType: string;
  upsert?: boolean;
}) {
  const admin = createAdminClient();
  const { error } = await admin.storage
    .from(input.bucket)
    .upload(input.objectKey, input.body, {
      contentType: input.contentType,
      upsert: input.upsert ?? false,
    });

  if (error) {
    throw error;
  }
}

export async function createSignedUrl(input: {
  bucket: string;
  objectKey: string;
  expiresInSeconds?: number;
}) {
  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from(input.bucket)
    .createSignedUrl(input.objectKey, input.expiresInSeconds ?? 3600);

  if (error) {
    throw error;
  }

  return data.signedUrl;
}

export async function removeFromBucket(input: {
  bucket: string;
  objectKey: string;
}) {
  const admin = createAdminClient();
  const { error } = await admin.storage.from(input.bucket).remove([input.objectKey]);

  if (error) {
    throw error;
  }
}

export async function checkStorageBuckets(requiredBuckets: string[]) {
  const admin = createAdminClient();
  const { data, error } = await admin.storage.listBuckets();

  if (error) {
    throw error;
  }

  const existing = new Set(data.map((bucket) => bucket.name));
  const missing = requiredBuckets.filter((name) => !existing.has(name));

  return {
    ok: missing.length === 0,
    missing,
  };
}

export async function ensureStorageBuckets(
  buckets: ReadonlyArray<{ name: string; public: boolean }>,
) {
  const admin = createAdminClient();
  const { data, error } = await admin.storage.listBuckets();

  if (error) {
    throw error;
  }

  const existing = new Set(data.map((bucket) => bucket.name));

  for (const bucket of buckets) {
    if (existing.has(bucket.name)) {
      continue;
    }

    const { error: createError } = await admin.storage.createBucket(bucket.name, {
      public: bucket.public,
    });

    if (createError) {
      throw createError;
    }
  }
}

export function productMediaPublicUrl(objectKey: string): string {
  const { supabaseUrl } = getPublicEnv();
  return `${supabaseUrl}/storage/v1/object/public/${STORAGE_BUCKETS.productMedia}/${objectKey}`;
}
