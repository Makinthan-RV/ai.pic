import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { aiIndexImage } from "@/lib/ai";
import { uploadImage } from "@/lib/storage";

// Large photo batches — allow more time and disable body size caps.
export const maxDuration = 300;

/**
 * POST /api/event/upload   (multipart form)
 *   fields: event_id, files[] (one or more images)
 *
 * For each photo we:
 *   1) send it to the Python AI service to detect + store face embeddings
 *      (the AI service assigns the image_id and returns it),
 *   2) upload the same bytes to Cloudflare R2,
 *   3) record metadata in Supabase using that SAME image_id, so /match results
 *      map straight back to the R2 url.
 */
export async function POST(req: Request) {
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await req.formData();
  const eventId = String(form.get("event_id") ?? "");
  const files = form.getAll("files").filter((f): f is File => f instanceof File);

  if (!eventId) return NextResponse.json({ error: "event_id is required" }, { status: 400 });
  if (files.length === 0)
    return NextResponse.json({ error: "No files provided" }, { status: 400 });

  // Verify the event belongs to this photographer (defense in depth; RLS too).
  const { data: event } = await supabase
    .from("events")
    .select("id")
    .eq("id", eventId)
    .single();
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

  const results: Array<Record<string, unknown>> = [];

  for (const file of files) {
    try {
      const buffer = Buffer.from(await file.arrayBuffer());
      const blob = new Blob([buffer], { type: file.type || "image/jpeg" });

      // 1) Index faces via the existing AI service (it returns the image_id).
      const indexed = await aiIndexImage(eventId, blob, file.name);
      if (!indexed.image_id) {
        results.push({ filename: file.name, error: indexed.error ?? "index failed" });
        continue;
      }

      // 2) Store the canonical image in Supabase Storage under a deterministic key.
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const key = `events/${eventId}/${indexed.image_id}.${ext}`;
      const { url } = await uploadImage(key, buffer, file.type || "image/jpeg");

      // 3) Persist metadata with the AI-assigned id.
      const { error: dbErr } = await supabase.from("images").insert({
        id: indexed.image_id,
        event_id: eventId,
        user_id: user.id,
        image_url: url,
        storage_key: key,
        face_count: indexed.faces ?? 0,
      });
      if (dbErr) {
        results.push({ filename: file.name, error: dbErr.message });
        continue;
      }

      results.push({
        filename: file.name,
        image_id: indexed.image_id,
        faces: indexed.faces ?? 0,
        url,
      });
    } catch (err: any) {
      results.push({ filename: file.name, error: err.message ?? "upload failed" });
    }
  }

  const uploaded = results.filter((r) => !r.error).length;
  return NextResponse.json({ event_id: eventId, uploaded, results });
}
