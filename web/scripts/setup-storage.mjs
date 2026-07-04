/**
 * One-time setup: create the public Supabase Storage bucket for event photos.
 * Safe to re-run (ignores "already exists").
 *
 * Run:  node --env-file=.env.local scripts/setup-storage.mjs
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const bucket = process.env.STORAGE_BUCKET ?? "event-photos";

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const sb = createClient(url, key, { auth: { persistSession: false } });

const { error } = await sb.storage.createBucket(bucket, {
  public: true,
  fileSizeLimit: "25MB",
  allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
});

if (error && !/already exists/i.test(error.message)) {
  console.error("Failed to create bucket:", error.message);
  process.exit(1);
}
console.log(`Bucket "${bucket}" ready (public).`);
