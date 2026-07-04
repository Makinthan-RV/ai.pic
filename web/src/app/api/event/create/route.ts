import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";

// POST /api/event/create  { name, description?, event_date? }
export async function POST(req: Request) {
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const name = (body.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "Event name is required" }, { status: 400 });

  const { data, error } = await supabase
    .from("events")
    .insert({
      user_id: user.id,
      name,
      description: body.description ?? null,
      event_date: body.event_date ?? null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ event: data }, { status: 201 });
}
