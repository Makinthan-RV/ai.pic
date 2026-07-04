import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";

// GET /api/event/list  -> the logged-in photographer's events (with photo counts)
export async function GET() {
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // RLS already restricts to this user's events.
  const { data, error } = await supabase
    .from("events")
    .select("*, images(count)")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const events = (data ?? []).map((e: any) => ({
    ...e,
    photo_count: e.images?.[0]?.count ?? 0,
    images: undefined,
  }));
  return NextResponse.json({ events });
}
