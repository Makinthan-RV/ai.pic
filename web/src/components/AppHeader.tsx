"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { getSupabaseBrowser } from "@/lib/supabase/client";

/** Sticky top bar shared across authenticated pages. */
export function AppHeader({ email }: { email?: string }) {
  const router = useRouter();
  async function logout() {
    await getSupabaseBrowser().auth.signOut();
    router.push("/login");
    router.refresh();
  }
  return (
    <header className="sticky top-0 z-40 border-b border-neutral-200 bg-white/80 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/80">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
        <Link href="/dashboard" className="flex items-center gap-1">
          <span className="rounded-xl rounded-bl-sm bg-neutral-900 px-2.5 py-1 text-xs font-black text-white dark:bg-white dark:text-neutral-900">
            PHOTO
          </span>
          <span className="rounded-full bg-brand px-2.5 py-1 text-xs font-black text-white">
            FINDER
          </span>
        </Link>
        {email && (
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-neutral-500 sm:inline">{email}</span>
            <button
              onClick={logout}
              className="flex items-center gap-1.5 rounded-lg border border-neutral-300 px-3 py-1.5 text-sm font-medium transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
            >
              <LogOut className="h-4 w-4" /> Log out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
