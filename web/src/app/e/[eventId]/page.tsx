import { getSupabaseAdmin } from "@/lib/supabase/server";
import { GuestMatcher } from "./GuestClient";

// Public page reached by scanning an event QR code. No login required.
export default async function GuestPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;

  // Look up the event name with the service-role client (no user session here).
  const admin = getSupabaseAdmin();
  const { data: event } = await admin
    .from("events")
    .select("name")
    .eq("id", eventId)
    .single();

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-10">
      <div className="text-center">
        <h1 className="text-2xl font-bold">{event?.name ?? "Find your photos"}</h1>
        <p className="mt-2 text-neutral-600 dark:text-neutral-400">
          Take or upload a selfie and we&apos;ll instantly find every photo
          you&apos;re in.
        </p>
      </div>
      <div className="mt-8">
        <GuestMatcher eventId={eventId} eventMissing={!event} />
      </div>
    </main>
  );
}
