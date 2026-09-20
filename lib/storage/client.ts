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

export async function downloadFromBucket(input: {
  bucket: string;
  objectKey: string;
}): Promise<Buffer> {
  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from(input.bucket)
    .download(input.objectKey);

  if (error || !data) {
    throw error ?? new Error(`Failed to download ${input.bucket}/${input.objectKey}`);
  }

  return Buffer.from(await data.arrayBuffer());
}

/**
 * Signed links are re-requested for every thumbnail on every page view, which
 * put a Supabase round trip in front of each image. They're valid for an hour,
 * so hold them in memory for most of that and hand back the same link.
 */
const signedUrlCache = new Map<string, { url: string; expiresAt: number }>();

export async function createSignedUrl(input: {
  bucket: string;
  objectKey: string;
  expiresInSeconds?: number;
}) {
  const ttl = input.expiresInSeconds ?? 3600;
  const key = `${input.bucket}/${input.objectKey}/${ttl}`;
  const hit = signedUrlCache.get(key);
  if (hit && hit.expiresAt > Date.now()) return hit.url;

  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from(input.bucket)
    .createSignedUrl(input.objectKey, ttl);

  if (error) {
    throw error;
  }

  // Keep a safety margin so a cached link never expires in someone's browser.
  signedUrlCache.set(key, { url: data.signedUrl, expiresAt: Date.now() + Math.max(30, ttl - 300) * 1000 });
  if (signedUrlCache.size > 2000) {
    for (const [k, v] of signedUrlCache) if (v.expiresAt <= Date.now()) signedUrlCache.delete(k);
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
