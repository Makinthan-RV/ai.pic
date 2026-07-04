"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ImageIcon, Upload, X, CheckCircle2, AlertCircle } from "lucide-react";
import { Button, Card } from "@/components/ui";

interface Photo {
  image_id: string;
  url: string;
}

type FileStatus = "pending" | "done" | "error";

function humanSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function UploadPanel({ eventId }: { eventId: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [statuses, setStatuses] = useState<Record<string, FileStatus>>({});
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);

  function addFiles(list: FileList | null) {
    if (!list) return;
    const imgs = Array.from(list).filter((f) => f.type.startsWith("image/"));
    setFiles((prev) => [...prev, ...imgs]);
    setSummary(null);
  }

  function removeFile(name: string) {
    setFiles((prev) => prev.filter((f) => f.name !== name));
  }

  async function upload() {
    if (files.length === 0) return;
    setBusy(true);
    setSummary(`Uploading & indexing ${files.length} photo(s)…`);

    const form = new FormData();
    form.append("event_id", eventId);
    files.forEach((f) => form.append("files", f));

    try {
      const res = await fetch("/api/event/upload", { method: "POST", body: form });
      if (!res.ok) {
        setSummary("Upload failed. Is the AI service running?");
        setBusy(false);
        return;
      }
      const data = await res.json();
      const next: Record<string, FileStatus> = {};
      for (const r of data.results as { filename: string; error?: string }[]) {
        next[r.filename] = r.error ? "error" : "done";
      }
      setStatuses(next);
      setSummary(`Done — ${data.uploaded}/${data.results.length} indexed.`);
      router.refresh();
    } catch {
      setSummary("Network error during upload.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <h2 className="mb-3 font-semibold">Upload event photos</h2>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files); }}
        onClick={() => inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors ${
          dragOver ? "border-brand bg-brand/5" : "border-neutral-300 hover:border-brand dark:border-neutral-700"
        }`}
      >
        <Upload className="h-7 w-7 text-neutral-400" />
        <p className="text-sm">
          <span className="font-medium text-brand">Drag &amp; drop</span> or click to choose photos
        </p>
        <p className="text-xs text-neutral-400">JPG, PNG, WEBP — up to 25 MB each</p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          onChange={(e) => addFiles(e.target.files)}
        />
      </div>

      {/* Selected files */}
      {files.length > 0 && (
        <ul className="mt-4 space-y-2">
          {files.map((f) => {
            const st = statuses[f.name];
            return (
              <li key={f.name} className="flex items-center gap-3 rounded-lg bg-neutral-50 p-2.5 dark:bg-neutral-800">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-white shadow-sm ring-1 ring-neutral-200 dark:bg-neutral-900 dark:ring-neutral-700">
                  <ImageIcon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium">{f.name}</p>
                  <p className="text-xs text-neutral-400">{humanSize(f.size)}</p>
                </div>
                {st === "done" && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                {st === "error" && <AlertCircle className="h-4 w-4 text-red-500" />}
                {!st && !busy && (
                  <button onClick={() => removeFile(f.name)} aria-label="Remove"
                    className="rounded-md p-1 text-neutral-400 hover:text-neutral-700">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-4 flex items-center gap-3">
        <Button onClick={upload} disabled={busy || files.length === 0}>
          {busy ? "Working…" : `Upload & index${files.length ? ` (${files.length})` : ""}`}
        </Button>
        {files.length > 0 && !busy && (
          <button onClick={() => { setFiles([]); setStatuses({}); setSummary(null); }}
            className="text-sm text-neutral-400 hover:text-neutral-600">
            Clear
          </button>
        )}
        {summary && <span className="text-sm text-neutral-500">{summary}</span>}
      </div>
    </Card>
  );
}

const PAGE = 48;

export function GalleryGrid({ initialPhotos }: { initialPhotos: Photo[] }) {
  const [visible, setVisible] = useState(PAGE);

  if (initialPhotos.length === 0) {
    return <p className="text-neutral-500">No photos uploaded yet.</p>;
  }

  const shown = initialPhotos.slice(0, visible);
  const remaining = initialPhotos.length - visible;

  return (
    <div>
      {/* Uniform aligned grid; only `visible` rendered so 1000s of photos stay fast */}
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
        {shown.map((p) => (
          <a key={p.image_id} href={p.url} target="_blank" className="group relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={p.url}
              alt=""
              loading="lazy"
              className="aspect-square w-full rounded-lg bg-neutral-100 object-cover transition group-hover:opacity-90 dark:bg-neutral-800"
            />
          </a>
        ))}
      </div>

      {remaining > 0 && (
        <div className="mt-6 flex justify-center">
          <Button variant="ghost" onClick={() => setVisible((v) => v + PAGE)}>
            Load {Math.min(PAGE, remaining)} more ({remaining} left)
          </Button>
        </div>
      )}
    </div>
  );
}
