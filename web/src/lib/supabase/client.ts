"use client";

import { createBrowserClient } from "@supabase/ssr";

/** Browser Supabase client for auth (login/signup) in client components. */
export function getSupabaseBrowser() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
