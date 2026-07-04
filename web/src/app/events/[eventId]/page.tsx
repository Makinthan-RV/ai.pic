import Link from "next/link";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { ArrowLeft, Calendar, Images, QrCode } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { AppHeader } from "@/components/AppHeader";
import { QRActions } from "@/components/QRActions";
import { UploadPanel, GalleryGrid } from "./EventClient";

export default async function EventPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const { user, supabase } = await requireUser();

  const { data: event } = await supabase.from("events").select("*").eq("id", eventId).single();
  if (!event) notFound();

  const { data: images } = await supabase
    .from("images")
    .select("id, image_url, face_count, created_at")
    .eq("event_id", eventId)
    .order("created_at", { ascending: false });

  const photos = images ?? [];
  const totalFaces = photos.reduce((n, i) => n + (i.face_count ?? 0), 0);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const guestUrl = `${appUrl}/e/${eventId}`;
  const qrDataUrl = await QRCode.toDataURL(guestUrl, { width: 240, margin: 1 });

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      <AppHeader email={user.email} />

      <main className="mx-auto max-w-5xl px-6 py-8">
        <Link href="/dashboard" className="inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-brand">
          <ArrowLeft className="h-4 w-4" /> All events
        </Link>

        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{event.name}</h1>
            <div className="mt-1 flex items-center gap-4 text-sm text-neutral-500">
              {event.event_date && (
                <span className="flex items-center gap-1.5"><Calendar className="h-4 w-4" /> {event.event_date}</span>
              )}
              <span className="flex items-center gap-1.5"><Images className="h-4 w-4" /> {photos.length} photos</span>
              <span>{totalFaces} faces indexed</span>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <UploadPanel eventId={eventId} />
          </div>

          {/* QR card */}
          <div className="flex flex-col items-center rounded-xl border border-neutral-200 bg-white p-5 text-center shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
            <div className="mb-3 flex items-center gap-1.5 text-sm font-semibold">
              <QrCode className="h-4 w-4 text-brand" /> Guest QR code
            </div>
            <div className="rounded-xl bg-white p-2 ring-1 ring-neutral-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrDataUrl} alt="Event QR code" width={190} height={190} />
            </div>
            <p className="mt-3 text-xs text-neutral-500">Guests scan this to find their photos.</p>
            <QRActions guestUrl={guestUrl} qrDataUrl={qrDataUrl} eventName={event.name} />
            <a href={guestUrl} target="_blank" className="mt-2 break-all text-[11px] text-neutral-400 hover:text-brand hover:underline">
              {guestUrl}
            </a>
          </div>
        </div>

        <h2 className="mb-4 mt-10 text-lg font-semibold">Photos ({photos.length})</h2>
        <GalleryGrid initialPhotos={photos.map((i) => ({ image_id: i.id, url: i.image_url }))} />
      </main>
    </div>
  );
}
