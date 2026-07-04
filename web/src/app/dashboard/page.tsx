import Link from "next/link";
import { Calendar, Images, ArrowRight } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { AppHeader } from "@/components/AppHeader";
import { CreateEventForm } from "./DashboardClient";

export default async function DashboardPage() {
  const { user, supabase } = await requireUser();

  const { data: events } = await supabase
    .from("events")
    .select("*, images(count)")
    .order("created_at", { ascending: false });

  const list = events ?? [];
  const totalPhotos = list.reduce((n: number, e: any) => n + (e.images?.[0]?.count ?? 0), 0);

  // One recent photo per event as the cover (cheap: limited to 1 per event).
  const covers = new Map<string, string>();
  if (list.length > 0) {
    const { data: coverRows } = await supabase
      .from("events")
      .select("id, images(image_url)")
      .order("created_at", { referencedTable: "images", ascending: false })
      .limit(1, { referencedTable: "images" });
    for (const row of coverRows ?? []) {
      const url = (row as any).images?.[0]?.image_url;
      if (url) covers.set((row as any).id, url);
    }
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      <AppHeader email={user.email} />

      <main className="mx-auto max-w-5xl px-6 py-8">
        {/* Blue banner (solid, grid-textured — clean, not glowing) */}
        <div className="relative mb-8 overflow-hidden rounded-2xl bg-[#0038FF] p-6 text-white md:p-8">
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#ffffff12_1px,transparent_1px),linear-gradient(to_bottom,#ffffff12_1px,transparent_1px)] bg-[size:2.5rem_2.5rem]" />
          <div className="relative">
            <h1 className="text-2xl font-bold md:text-3xl">Your events</h1>
            <p className="mt-1 text-white/80">Create an event, upload photos, share the QR.</p>
            <div className="mt-6 flex gap-8">
              <Stat label="Events" value={list.length} />
              <Stat label="Photos indexed" value={totalPhotos} />
            </div>
          </div>
        </div>

        <div className="mb-8">
          <CreateEventForm />
        </div>

        {list.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-neutral-300 py-16 text-center dark:border-neutral-700">
            <Images className="mx-auto h-8 w-8 text-neutral-300" />
            <p className="mt-3 font-medium">No events yet</p>
            <p className="text-sm text-neutral-500">Create your first one above to get started.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((e: any) => {
              const cover = covers.get(e.id);
              return (
                <Link key={e.id} href={`/events/${e.id}`}
                  className="group overflow-hidden rounded-2xl border border-neutral-200 bg-white transition-all hover:-translate-y-0.5 hover:border-[#0038FF]/40 hover:shadow-lg dark:border-neutral-800 dark:bg-neutral-900">
                  <div className="relative flex h-32 items-center justify-center bg-[#0038FF]/10">
                    {cover ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={cover} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <Images className="h-8 w-8 text-[#0038FF]/50" />
                    )}
                  </div>
                  <div className="p-4">
                    <h2 className="font-semibold">{e.name}</h2>
                    <div className="mt-2 flex items-center justify-between text-sm text-neutral-500">
                      <span className="flex items-center gap-1.5">
                        {e.event_date ? (<><Calendar className="h-3.5 w-3.5" /> {e.event_date}</>) : "No date"}
                      </span>
                      <span>{e.images?.[0]?.count ?? 0} photos</span>
                    </div>
                    <span className="mt-3 flex items-center gap-1 text-sm font-medium text-[#0038FF] opacity-0 transition-opacity group-hover:opacity-100">
                      Open <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-2xl font-bold md:text-3xl">{value.toLocaleString()}</p>
      <p className="text-sm text-white/70">{label}</p>
    </div>
  );
}
