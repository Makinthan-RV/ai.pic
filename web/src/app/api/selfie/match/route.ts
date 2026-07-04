import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { aiMatchSelfie, AiNoFaceError } from "@/lib/ai";

// Guest flow — no login. Runs with the service-role client (RLS bypassed),
// strictly scoped to the event_id in the request.
export const maxDuration = 60;

/**
 * POST /api/selfie/match   (multipart form)
 *   fields: event_id, selfie (image)
 * Returns the event photos containing the guest, as R2 urls, ranked by score.
 */
export async function POST(req: Request) {
  const form = await req.formData();
  const eventId = String(form.get("event_id") ?? "");
  const selfie = form.get("selfie");

  if (!eventId) return NextResponse.json({ error: "event_id is required" }, { status: 400 });
  if (!(selfie instanceof File))
    return NextResponse.json({ error: "selfie file is required" }, { status: 400 });

  const admin = getSupabaseAdmin();

  // Confirm the event exists (guests reference it by QR link).
  const { data: event } = await admin
    .from("events")
    .select("id, name")
    .eq("id", eventId)
    .single();
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

  // 1) Ask the AI service which photos this face appears in.
  let matches;
  try {
    const buffer = Buffer.from(await selfie.arrayBuffer());
    const blob = new Blob([buffer], { type: selfie.type || "image/jpeg" });
    matches = await aiMatchSelfie(eventId, blob, selfie.name || "selfie.jpg");
  } catch (err) {
    if (err instanceof AiNoFaceError) {
      return NextResponse.json(
        { error: "We couldn't find a face in that photo. Try a clearer selfie." },
        { status: 422 },
      );
    }
    return NextResponse.json({ error: "Matching service unavailable" }, { status: 502 });
  }

  if (matches.length === 0) {
    return NextResponse.json({ event: event.name, match_count: 0, photos: [] });
  }

  // 2) Map matched image_ids -> R2 urls from Supabase.
  const ids = matches.map((m) => m.image_id);
  const scoreById = new Map(matches.map((m) => [m.image_id, m.score]));

  const { data: images } = await admin
    .from("images")
    .select("id, image_url")
    .eq("event_id", eventId)
    .in("id", ids);

  const photos = (images ?? [])
    .map((img) => ({
      image_id: img.id,
      url: img.image_url,
      score: scoreById.get(img.id) ?? 0,
    }))
    .sort((a, b) => b.score - a.score);

  // 3) Best-effort analytics log (non-blocking on failure).
  admin
    .from("matches")
    .insert(photos.map((p) => ({ event_id: eventId, image_id: p.image_id, score: p.score })))
    .then(() => {}, () => {});

  return NextResponse.json({ event: event.name, match_count: photos.length, photos });
}
