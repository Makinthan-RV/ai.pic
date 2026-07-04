"use client";

import { useState } from "react";
import { Button, Card } from "@/components/ui";
import { FaceScan } from "./FaceScan";

interface MatchPhoto {
  image_id: string;
  url: string;
  score: number;
}

type Mode = "choose" | "scan" | "upload";

export function GuestMatcher({
  eventId,
  eventMissing,
}: {
  eventId: string;
  eventMissing: boolean;
}) {
  const [mode, setMode] = useState<Mode>("choose");
  const [matching, setMatching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [photos, setPhotos] = useState<MatchPhoto[] | null>(null);

  if (eventMissing) {
    return (
      <Card>
        <p className="text-center text-neutral-500">
          This event link is invalid or has been removed.
        </p>
      </Card>
    );
  }

  async function runMatch(image: Blob) {
    setMatching(true);
    setError(null);
    setPhotos(null);

    const form = new FormData();
    form.append("event_id", eventId);
    form.append("selfie", image, "selfie.jpg");

    try {
      const res = await fetch("/api/selfie/match", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
      } else {
        setPhotos(data.photos);
      }
    } catch {
      setError("Network error — please try again.");
    } finally {
      setMatching(false);
    }
  }

  function reset() {
    setPhotos(null);
    setError(null);
    setMode("choose");
  }

  // Results view
  if (photos) {
    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">
            {photos.length > 0
              ? `Found ${photos.length} photo${photos.length === 1 ? "" : "s"} of you`
              : "No matches found"}
          </h2>
          <Button variant="ghost" onClick={reset}>
            Scan again
          </Button>
        </div>
        {photos.length === 0 && (
          <p className="text-sm text-neutral-500">
            Try again with a clearer, front-facing shot in good light.
          </p>
        )}
        <div className="grid grid-cols-2 gap-3">
          {photos.map((p) => (
            <div key={p.image_id} className="group relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.url}
                alt=""
                loading="lazy"
                className="aspect-square w-full rounded-lg object-cover"
              />
              <a
                href={p.url}
                download
                target="_blank"
                className="absolute bottom-2 right-2 rounded-md bg-black/70 px-2 py-1 text-xs text-white opacity-0 transition group-hover:opacity-100"
              >
                Download
              </a>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Input views
  return (
    <Card>
      {mode === "choose" && (
        <div className="flex flex-col gap-3">
          <Button onClick={() => setMode("scan")}>📸 Scan my face</Button>
          <Button variant="ghost" onClick={() => setMode("upload")}>
            Upload a photo instead
          </Button>
        </div>
      )}

      {mode === "scan" && (
        <div className="space-y-3">
          <FaceScan processing={matching} onCaptured={runMatch} />
          {error && <p className="text-center text-sm text-red-600">{error}</p>}
          <button
            onClick={reset}
            className="mx-auto block text-xs text-neutral-400 underline underline-offset-2"
          >
            back
          </button>
        </div>
      )}

      {mode === "upload" && (
        <UploadForm matching={matching} error={error} onPick={runMatch} onBack={reset} />
      )}
    </Card>
  );
}

function UploadForm({
  matching,
  error,
  onPick,
  onBack,
}: {
  matching: boolean;
  error: string | null;
  onPick: (f: Blob) => void;
  onBack: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  return (
    <div className="space-y-4">
      <input
        type="file"
        accept="image/*"
        capture="user"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        className="block w-full text-sm text-neutral-600 file:mr-4 file:rounded-lg file:border-0 file:bg-brand file:px-4 file:py-2 file:text-white"
      />
      <Button onClick={() => file && onPick(file)} disabled={matching || !file} className="w-full">
        {matching ? "Searching…" : "Find my photos"}
      </Button>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        onClick={onBack}
        className="mx-auto block text-xs text-neutral-400 underline underline-offset-2"
      >
        back
      </button>
    </div>
  );
}
