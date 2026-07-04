import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";

// GET /api/event/:eventId/gallery
// Owner-only: all photos in an event (RLS restricts to the owner).
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const { eventId } = await params;
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("images")
    .select("id, image_url, face_count, created_at")
    .eq("event_id", eventId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ event_id: eventId, photos: data ?? [] });
}
