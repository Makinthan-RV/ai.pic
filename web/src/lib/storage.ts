import { getSupabaseAdmin } from "./supabase/server";

/**
 * Photo storage backed by Supabase Storage (a public bucket).
 * Chosen over Cloudflare R2 so no separate account / payment card is needed.
 *
 * The bucket is created by scripts/setup-storage.mjs. Uploads run server-side
 * with the service-role client (bypasses storage RLS); reads are public URLs.
 */
export const STORAGE_BUCKET = process.env.STORAGE_BUCKET ?? "event-photos";

export async function uploadImage(
  key: string,
  body: Buffer | Uint8Array,
  contentType: string,
): Promise<{ url: string; key: string }> {
  const admin = getSupabaseAdmin();

  const { error } = await admin.storage.from(STORAGE_BUCKET).upload(key, body, {
    contentType,
    upsert: true,
  });
  if (error) throw new Error(`Storage upload failed: ${error.message}`);

  const { data } = admin.storage.from(STORAGE_BUCKET).getPublicUrl(key);
  return { url: data.publicUrl, key };
}
