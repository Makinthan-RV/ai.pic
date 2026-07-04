import { redirect } from "next/navigation";
import { getSupabaseServer } from "./supabase/server";

/** Return the logged-in photographer, or redirect to /login. */
export async function requireUser() {
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { user, supabase };
}
